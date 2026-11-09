import { io } from "socket.io-client";
import { CourierConfig } from "./couriers";
import { TrackingResult, TrackingActivity, RouteMilestone } from "@/app/api/track/route";
import { generateSecureTrackingToken } from "./security";

function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

function formatArticleType(art?: string): string {
  if (!art || art === "UNKNOWN") return "Standard Express Parcel";
  return art
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Sp ", "Speed Post ")
    .replace("Doc", "Document");
}

function mapStatusToStage(statusStr?: string, eventStr?: string): "booked" | "dispatched" | "in_transit" | "out_for_delivery" | "delivered" {
  const combined = `${statusStr || ""} ${eventStr || ""}`.toLowerCase();
  if (combined.includes("deliver") && !combined.includes("out for") && !combined.includes("scheduled")) {
    return "delivered";
  }
  if (combined.includes("out for delivery") || combined.includes("scheduled for delivery")) {
    return "out_for_delivery";
  }
  if (
    combined.includes("dispatched") ||
    combined.includes("bagged") ||
    combined.includes("in transit") ||
    combined.includes("received") ||
    combined.includes("processing") ||
    combined.includes("transit") ||
    combined.includes("hub")
  ) {
    return "in_transit";
  }
  if (combined.includes("booked") || combined.includes("pickup") || combined.includes("created")) {
    return "booked";
  }
  return "in_transit";
}

export function normalizeLiveTrackingData(
  raw: any,
  trackingNumber: string,
  courier: CourierConfig
): TrackingResult {
  const data = raw?.data || {};
  const booking = data.booking_details || {};
  const details: any[] = Array.isArray(data.tracking_details) ? data.tracking_details : [];

  // Determine overall status
  const rawStatus = (data.del_status || data.overall_status || data.overall_state || "").toLowerCase();
  let overallStage: "booked" | "dispatched" | "in_transit" | "out_for_delivery" | "delivered" = "in_transit";
  let variant: "delivered" | "in-transit" | "out-for-delivery" | "pending" = "in-transit";

  if (rawStatus.includes("deliver") && !rawStatus.includes("out")) {
    overallStage = "delivered";
    variant = "delivered";
  } else if (rawStatus.includes("out for delivery") || details[0]?.status === "out_for_delivery") {
    overallStage = "out_for_delivery";
    variant = "out-for-delivery";
  } else if (rawStatus.includes("booked") || details.length <= 1) {
    overallStage = "booked";
    variant = "pending";
  } else {
    overallStage = "in_transit";
    variant = "in-transit";
  }

  // Determine primary status phrase
  let phrase = data.status_ui?.phrase || data.del_status || details[0]?.event || "Shipment in Transit";
  phrase = phrase.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Format activities
  const activities: TrackingActivity[] = details.map((d: any, idx: number) => {
    let dateStr = "Recent";
    let timeStr = d.time || "";

    if (d.date) {
      try {
        const parsed = new Date(d.date);
        if (!isNaN(parsed.getTime())) {
          dateStr = parsed.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          if (!timeStr) {
            timeStr = parsed.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
          }
        }
      } catch {
        dateStr = d.date;
      }
    }

    const facility = d.office && d.office !== "Null" ? d.office : booking.destination_city || "Transit Hub";
    const statusText = d.event || d.remarks || d.status || "Checkpoint Scanned";
    const stage = mapStatusToStage(d.status, d.event);

    return {
      id: `act-${idx}`,
      date: dateStr,
      time: timeStr,
      facility,
      statusText: statusText.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      stage,
      details: d.remarks && d.remarks !== d.event ? d.remarks : undefined,
    };
  });

  // Build clean locations
  const originCity = booking.origin_city || booking.booked_at || booking.booking_office_name || "Origin Facility";
  const originPin = booking.origin_pincode || booking.booking_pin ? ` (${booking.origin_pincode || booking.booking_pin})` : "";
  const originStr = `${originCity}${originPin}`;

  const destCity =
    booking.destination_office_name || booking.destination_city || booking.delivery_location || "Destination Hub";
  const destPin = booking.destination_pincode ? ` (${booking.destination_pincode})` : "";
  const destStr = destCity !== "Null" ? `${destCity}${destPin}` : "Destination Hub";

  // Build Route Milestones
  const routeMilestones: RouteMilestone[] = [];
  routeMilestones.push({
    id: "m-origin",
    name: originCity,
    city: originStr,
    role: "origin",
    status: "completed",
    timestamp: formatDate(booking.booked_on || booking.booking_date),
  });

  // Extract unique intermediate facilities
  const intermediateOffices = Array.from(
    new Set(
      activities
        .map((a) => a.facility)
        .filter((f) => f && f !== originCity && f !== destCity && f !== "Null")
    )
  ).slice(0, 2);

  intermediateOffices.forEach((office, i) => {
    routeMilestones.push({
      id: `m-transit-${i}`,
      name: office.split(" ")[0] || "Transit Hub",
      city: office,
      role: "transit",
      status: "completed",
    });
  });

  routeMilestones.push({
    id: "m-dest",
    name: destCity !== "Null" ? destCity : "Delivery Destination",
    city: destStr,
    role: "destination",
    status: overallStage === "delivered" ? "completed" : overallStage === "out_for_delivery" ? "active" : "upcoming",
    timestamp: booking.delivery_confirmed_on
      ? formatDate(booking.delivery_confirmed_on)
      : booking.expected_delivery_date || "Expected Soon",
  });

  // Weight and Tariff
  const weightStr = booking.weight_value
    ? `${booking.weight_value} ${parseInt(booking.weight_value) > 10 ? "grams" : "kg"}`
    : "Standard Express";

  const tariffStr = booking.tariff ? `₹ ${booking.tariff}` : "Prepaid";

  const lastUpdated = activities[0]?.date ? `${activities[0].date} · ${activities[0].time}` : "Updated Live";

  // Estimated Delivery
  const isDelivered = overallStage === "delivered";
  let etaDate = isDelivered ? "Delivered" : "Expected in 1-2 Business Days";
  if (!isDelivered && booking.expected_delivery_date) {
    try {
      const ed = new Date(booking.expected_delivery_date);
      if (!isNaN(ed.getTime())) {
        etaDate = `Expected by ${ed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
      } else {
        etaDate = `Expected by ${booking.expected_delivery_date}`;
      }
    } catch {
      etaDate = `Expected by ${booking.expected_delivery_date}`;
    }
  }

  return {
    trackingNumber,
    courier: {
      id: courier.id,
      name: courier.name,
      shortName: courier.shortName,
      label: courier.label,
      badgeColor: courier.badgeColor,
      supportPhone: courier.supportPhone,
      supportEmail: courier.supportEmail,
      avgTransitDays: courier.avgTransitDays,
    },
    overallStatus: {
      stage: overallStage,
      label: overallStage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      phrase,
      variant,
      timestamp: lastUpdated,
    },
    estimatedDelivery: {
      date: etaDate,
      confidence: isDelivered ? "100%" : "95%",
      rangeDays: courier.avgTransitDays,
      message: isDelivered
        ? `Delivered to recipient at ${destStr}${booking.delivery_confirmed_on ? ` on ${formatDate(booking.delivery_confirmed_on)}` : ""}.`
        : `Consignment is moving on schedule across ${courier.name} logistics network.`,
    },
    bookingDetails: {
      trackingNumber,
      courierId: courier.id,
      courierName: courier.name,
      bookedAt: formatDate(booking.booked_on || booking.booking_date),
      origin: originStr,
      destination: destStr,
      articleType: formatArticleType(booking.article_type || booking.service_type),
      weight: weightStr,
      tariff: tariffStr,
      currentLocation: activities[0]?.facility || destStr,
    },
    activities,
    routeMilestones,
    payloadHash: Buffer.from(JSON.stringify({ t: trackingNumber, c: courier.id })).toString("base64"),
    secureToken: generateSecureTrackingToken(trackingNumber, courier.id),
  };
}

export async function fetchLiveTracking(trackingNumber: string, courierId: string): Promise<any> {
  const cleanNum = trackingNumber.trim().toUpperCase();
  const cleanCourier = courierId.trim().toLowerCase();

  const url = `https://speedposttrack.io/tracking-result?d=${Buffer.from(
    JSON.stringify({ t: cleanNum, c: cleanCourier })
  ).toString("base64")}`;

  const getRes = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(6000),
  });

  const rawCookies = (getRes.headers as any).getSetCookie
    ? (getRes.headers as any).getSetCookie()
    : [getRes.headers.get("set-cookie")];
  const cookieStr = (rawCookies || []).filter(Boolean).map((c: string) => c.split(";")[0]).join("; ");

  const postRes = await fetch("https://speedposttrack.io/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: url,
      Origin: "https://speedposttrack.io",
      Cookie: cookieStr,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({ turnstileToken: null }),
    signal: AbortSignal.timeout(6000),
  });

  if (!postRes.ok) {
    throw new Error(`Session challenge response: ${postRes.status}`);
  }

  const tokenData = await postRes.json();
  const token = tokenData?.socketAuth?.token;
  if (!token) {
    throw new Error("No upstream token");
  }

  return new Promise((resolve, reject) => {
    const socket = io("https://speedposttrack.io", {
      transports: ["polling"],
      timeout: 10000,
      extraHeaders: {
        Cookie: cookieStr,
        Origin: "https://speedposttrack.io",
        Referer: url,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error("Upstream tracking socket timed out"));
    }, 10000);

    socket.on("connect", () => {
      socket.emit("track", { trackingNumber: cleanNum, courierId: cleanCourier, token });
    });

    socket.on("trackResult", (data) => {
      clearTimeout(timer);
      socket.disconnect();
      resolve(data);
    });

    socket.on("trackError", (err) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(new Error(err?.message || "Upstream query error"));
    });
  });
}
