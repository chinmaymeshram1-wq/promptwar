/** Sample profiles for Demo mode. Data only, so the browser can list them without pulling in validation code. */
import type { LifestyleInput } from './schemas.js';

export interface DemoProfile {
  id: string;
  label: string;
  description: string;
  lifestyle: LifestyleInput;
}

export const DEMO_PROFILES: readonly DemoProfile[] = [
  {
    id: 'city_commuter',
    label: 'Car commuter in Pune',
    description:
      'I drive my petrol car 25 km to the office five days a week. Our family of 3 uses about 250 units of electricity a month with AC in summer, one LPG cylinder a month, and we eat chicken most days.',
    lifestyle: {
      transport: [{ mode: 'car_petrol', kmPerWeek: 250 }],
      electricityKwhPerMonth: 250,
      householdSize: 3,
      lpgCylindersPerMonth: 1,
      diet: 'medium_meat',
    },
  },
  {
    id: 'student_hostel',
    label: 'College student',
    description:
      'I ride my motorbike about 10 km a day, take the metro on weekends for 30 km, I am vegetarian and live in a hostel with 4 roommates sharing 200 units of electricity a month.',
    lifestyle: {
      transport: [
        { mode: 'motorbike', kmPerWeek: 70 },
        { mode: 'metro_train', kmPerWeek: 30 },
      ],
      electricityKwhPerMonth: 200,
      householdSize: 5,
      diet: 'vegetarian',
    },
  },
  {
    id: 'frequent_flyer',
    label: 'Frequent flyer consultant',
    description:
      'I fly Mumbai to Delhi and back twice a month, take cabs around 100 km a week, live alone with 400 units a month and eat meat at almost every meal. I throw out about 5 kg of waste a week.',
    lifestyle: {
      transport: [
        { mode: 'flight', kmPerWeek: 1300 },
        { mode: 'car_petrol', kmPerWeek: 100 },
      ],
      electricityKwhPerMonth: 400,
      householdSize: 1,
      diet: 'heavy_meat',
      wasteKgPerWeek: 5,
    },
  },
];

export function findDemoProfile(id: string): DemoProfile | undefined {
  return DEMO_PROFILES.find((p) => p.id === id);
}
