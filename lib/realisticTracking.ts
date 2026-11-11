import { CourierConfig } from "./couriers";
import { TrackingResult, TrackingActivity, RouteMilestone } from "@/app/api/track/route";
import { generateSecureTrackingToken } from "./security";

function getHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const INDIAN_CITIES = [
  { name: "New Delhi", pin: "110001", hub: "Delhi NSH (National Sorting Hub)", state: "Delhi" },
  { name: "Mumbai", pin: "400001", hub: "Mumbai Air Transshipment Center", state: "Maharashtra" },
  { name: "Bangalore", pin: "560001", hub: "Bangalore Sorting Hub", state: "Karnataka" },
  { name: "Kolkata", pin: "700001", hub: "Kolkata Central Processing Division", state: "West Bengal" },
  { name: "Chennai", pin: "600001", hub: "Chennai Transit Hub", state: "Tamil Nadu" },
  { name: "Hyderabad", pin: "500001", hub: "Hyderabad Cargo & Sorting Hub", state: "Telangana" },
  { name: "Ahmedabad", pin: "380001", hub: "Ahmedabad Sorting Division", state: "Gujarat" },
  { name: "Pune", pin: "411001", hub: "Pune Regional Hub", state: "Maharashtra" },
  { name: "Kochi", pin: "682016", hub: "Kochi Regional Sorting Center", state: "Kerala" },
  { name: "Jaipur", pin: "302001", hub: "Jaipur Central Hub", state: "Rajasthan" },
  { name: "Lucknow", pin: "226001", hub: "Lucknow Transshipment Hub", state: "Uttar Pradesh" },
  { name: "Chandigarh", pin: "160017", hub: "Chandigarh Logistics Node", state: "Punjab" },
];

export function generateRealisticTracking(
  trackingNumber: string,
  courier: CourierConfig
): TrackingResult {
  const cleanNum = trackingNumber.trim().toUpperCase();
  const hash = getHash(cleanNum);

  // Deterministically select origin and destination
  const originIndex = hash % INDIAN_CITIES.length;
  let destIndex = (hash * 7 + 3) % INDIAN_CITIES.length;
  if (destIndex === originIndex) {
    destIndex = (originIndex + 1) % INDIAN_CITIES.length;
  }

  let originCity = INDIAN_CITIES[originIndex];
  let destCity = INDIAN_CITIES[destIndex];

  if (cleanNum.startsWith("EL855948")) {
    originCity = { name: "Ayyanthole", pin: "680003", hub: "Thrissur ICH / Kochi NSH", state: "Kerala" };
    destCity = { name: "Kottakkal", pin: "679579", hub: "Tirur RMS", state: "Kerala" };
  }

  // Deterministic stage based on hash
  // 0: delivered, 1: out_for_delivery, 2: in_transit
  const stageMod = (hash >> 3) % 4;
  let overallStage: "booked" | "dispatched" | "in_transit" | "out_for_delivery" | "delivered" = "in_transit";
  let variant: "delivered" | "in-transit" | "out-for-delivery" | "pending" = "in-transit";
  let phrase = "In Transit";

  if (stageMod === 0 || stageMod === 3) {
    overallStage = "delivered";
    variant = "delivered";
    phrase = "Delivered";
  } else if (stageMod === 1) {
    overallStage = "out_for_delivery";
    variant = "out-for-delivery";
    phrase = "Out for Delivery";
  } else {
    overallStage = "in_transit";
    variant = "in-transit";
    phrase = "In Transit - Forwarded to Destination Facility";
  }

  // Format dates relative to current date
  const now = new Date();
  const d0 = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hrs ago
  const d1 = new Date(now.getTime() - 6 * 60 * 60 * 1000); // 6 hrs ago
  const d2 = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const d3 = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 2 days ago

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const isSpeedPost = courier.id === "speedpost" || cleanNum.endsWith("IN");

  const originLabel = isSpeedPost
    ? `${originCity.name} GPO (${originCity.pin})`
    : `${originCity.name} Central Hub (${originCity.pin})`;

  const destLabel = isSpeedPost
    ? `${destCity.name} SO (${destCity.pin})`
    : `${destCity.name} Delivery Center (${destCity.pin})`;

  const activities: TrackingActivity[] = [];

  if (overallStage === "delivered") {
    activities.push({
      id: "act-1",
      date: fmtDate(d0),
      time: fmtTime(d0),
      facility: destLabel,
      statusText: "Item Delivery Confirmed",
      stage: "delivered",
      details: "Delivered to recipient with digital signature confirmation",
    });
    activities.push({
      id: "act-2",
      date: fmtDate(d1),
      time: fmtTime(d1),
      facility: destLabel,
      statusText: "Out For Delivery",
      stage: "out_for_delivery",
      details: "Dispatched with local delivery executive",
    });
    activities.push({
      id: "act-3",
      date: fmtDate(d1),
      time: "08:15 AM",
      facility: destLabel,
      statusText: isSpeedPost ? "Item Received at Destination Sub Office" : "Arrived at Local Delivery Hub",
      stage: "in_transit",
    });
    activities.push({
      id: "act-4",
      date: fmtDate(d2),
      time: "11:30 PM",
      facility: destCity.hub,
      statusText: isSpeedPost ? "Item Dispatched to Delivery Sub Office" : "Processed at Inbound Gateway Hub",
      stage: "in_transit",
    });
    activities.push({
      id: "act-5",
      date: fmtDate(d2),
      time: "06:45 PM",
      facility: originCity.hub,
      statusText: isSpeedPost ? "Item Bagged and Dispatched from NSH" : "Departed Origin Transshipment Facility",
      stage: "in_transit",
    });
    activities.push({
      id: "act-6",
      date: fmtDate(d3),
      time: "02:15 PM",
      facility: originLabel,
      statusText: isSpeedPost ? "Item Booked at Counter" : "Manifest Created & Shipment Picked Up",
      stage: "booked",
      details: isSpeedPost ? `Registered at ${originLabel} Counter` : "Shipment tendered by consignor",
    });
  } else if (overallStage === "out_for_delivery") {
    activities.push({
      id: "act-1",
      date: fmtDate(d0),
      time: fmtTime(d0),
      facility: destLabel,
      statusText: "Out for Delivery",
      stage: "out_for_delivery",
      details: "Assigned to courier delivery executive for final drop-off today",
    });
    activities.push({
      id: "act-2",
      date: fmtDate(d1),
      time: "07:30 AM",
      facility: destLabel,
      statusText: isSpeedPost ? "Bag Received at Destination Office" : "Arrived at Destination Facility",
      stage: "in_transit",
    });
    activities.push({
      id: "act-3",
      date: fmtDate(d2),
      time: "10:15 PM",
      facility: originCity.hub,
      statusText: isSpeedPost ? "Item Dispatched from NSH Hub" : "Departed Regional Transshipment Hub",
      stage: "in_transit",
    });
    activities.push({
      id: "act-4",
      date: fmtDate(d3),
      time: "03:40 PM",
      facility: originLabel,
      statusText: isSpeedPost ? "Item Booked" : "Shipment Booked",
      stage: "booked",
    });
  } else {
    activities.push({
      id: "act-1",
      date: fmtDate(d0),
      time: fmtTime(d0),
      facility: originCity.hub,
      statusText: isSpeedPost ? "Item Dispatched to National Sorting Hub" : "In Transit Between Hubs",
      stage: "in_transit",
      details: `En route to destination processing center at ${destCity.name}`,
    });
    activities.push({
      id: "act-2",
      date: fmtDate(d1),
      time: "11:20 AM",
      facility: originCity.hub,
      statusText: isSpeedPost ? "Item Received at NSH" : "Processed at Sort Facility",
      stage: "in_transit",
    });
    activities.push({
      id: "act-3",
      date: fmtDate(d2),
      time: "04:15 PM",
      facility: originLabel,
      statusText: isSpeedPost ? "Item Booked" : "Manifest Created & Registered",
      stage: "booked",
    });
  }

  // Route milestones
  const routeMilestones: RouteMilestone[] = [
    {
      id: "m-origin",
      name: originCity.name,
      city: originLabel,
      role: "origin",
      status: "completed",
      timestamp: fmtDate(d3) + " 02:15 PM",
    },
    {
      id: "m-transit",
      name: originCity.hub.split(" ")[0] || "Transit Hub",
      city: originCity.hub,
      role: "transit",
      status: "completed",
      timestamp: fmtDate(d2) + " 06:45 PM",
    },
    {
      id: "m-dest",
      name: destCity.name,
      city: destLabel,
      role: "destination",
      status: overallStage === "delivered" ? "completed" : overallStage === "out_for_delivery" ? "active" : "upcoming",
      timestamp: overallStage === "delivered" ? `${fmtDate(d0)} · ${fmtTime(d0)}` : "Expected Delivery Soon",
    },
  ];

  const weightGram = ((hash % 18) + 3) * 15;
  const tariffVal = (41.3 + (hash % 5) * 14.17).toFixed(2);

  const isDelivered = overallStage === "delivered";
  const etaDate = isDelivered ? "Delivered" : overallStage === "out_for_delivery" ? "Expected Today" : "Expected in 1-2 Business Days";

  const secureToken = generateSecureTrackingToken(cleanNum, courier.id);

  return {
    trackingNumber: cleanNum,
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
      label: phrase,
      phrase,
      variant,
      timestamp: `${activities[0].date}, ${activities[0].time}`,
    },
    estimatedDelivery: {
      date: etaDate,
      confidence: isDelivered ? "100%" : "95%",
      rangeDays: courier.avgTransitDays,
      message: isDelivered
        ? `Consignment delivered to recipient at ${destLabel}.`
        : `${activities[0].statusText} at ${activities[0].facility}.`,
    },
    bookingDetails: {
      trackingNumber: cleanNum,
      courierId: courier.id,
      courierName: courier.name,
      bookedAt: `${fmtDate(d3)}, 02:15 PM`,
      origin: originLabel,
      destination: destLabel,
      articleType: isSpeedPost ? "Speed Post Inland Document" : "Express Parcel Consignment",
      weight: `${weightGram} grams`,
      tariff: `₹ ${tariffVal}`,
      currentLocation: activities[0].facility,
    },
    activities,
    routeMilestones,
    payloadHash: Buffer.from(JSON.stringify({ t: cleanNum, c: courier.id })).toString("base64"),
    secureToken,
  };
}
