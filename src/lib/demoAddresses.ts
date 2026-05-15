export type DemoAddress = {
  label: string;
  address: string;
  lat: number;
  lng: number;
};

export const DEMO_ADDRESSES: DemoAddress[] = [
  {
    label: "Apple Park",
    address: "1 Apple Park Way, Cupertino, CA",
    lat: 37.3346,
    lng: -122.009,
  },
  {
    label: "Las Vegas Convention Center",
    address: "3150 Paradise Rd, Las Vegas, NV",
    lat: 36.1311,
    lng: -115.1518,
  },
  {
    label: "Mall of America",
    address: "60 E Broadway, Bloomington, MN",
    lat: 44.8548,
    lng: -93.2422,
  },
];
