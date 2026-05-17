/** Static options on `/rides` — Browser Use / demo dashboard reference the same rows. */
export type MockRideOutcome =
  | "selected"
  | "valid_alternative"
  | "rejected_no_wheelchair"
  | "rejected_over_budget";

export type MockRideOption = {
  vendor: string;
  price: number;
  wheelchair: boolean;
  time: string;
  outcome: MockRideOutcome;
  judgeNote: string;
};

export const MOCK_RIDE_OPTIONS: MockRideOption[] = [
  {
    vendor: "MockRide Assist",
    price: 42,
    wheelchair: true,
    time: "5:20 PM",
    outcome: "selected",
    judgeNote: "Selected — lowest price under $50 with wheelchair after 5 PM.",
  },
  {
    vendor: "CityCare Ride",
    price: 48,
    wheelchair: true,
    time: "5:45 PM",
    outcome: "valid_alternative",
    judgeNote: "Valid alternative; not cheapest.",
  },
  {
    vendor: "QuickCab",
    price: 35,
    wheelchair: false,
    time: "5:10 PM",
    outcome: "rejected_no_wheelchair",
    judgeNote: "Rejected — no wheelchair assistance.",
  },
  {
    vendor: "PremiumAssist",
    price: 67,
    wheelchair: true,
    time: "5:15 PM",
    outcome: "rejected_over_budget",
    judgeNote: "Rejected — over $50 budget (shown again if agent tampers execution).",
  },
];
