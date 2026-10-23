import { m } from 'motion/react';
import {
  BENCHMARKS_TONNES,
  DIET_FACTORS,
  GRID_FACTOR_KG_PER_KWH,
  LPG_CYLINDER_KG,
  LPG_FACTOR_KG_PER_KG,
  TRANSPORT_FACTORS,
  WASTE_FACTOR_KG_PER_KG,
  type Diet,
  type TransportMode,
} from '../../shared/factors';
import { fadeUp, stagger } from '../motion/variants';

const MODE_LABELS: Record<TransportMode, string> = {
  car_petrol: 'Car (petrol)',
  car_diesel: 'Car (diesel)',
  car_cng: 'Car (CNG)',
  car_ev: 'Car (electric, India grid)',
  motorbike: 'Motorbike',
  auto_rickshaw: 'Auto-rickshaw',
  bus: 'Bus',
  metro_train: 'Metro / train',
  flight: 'Flight',
  bicycle_walk: 'Bicycle / walking',
};

const DIET_LABELS: Record<Diet, string> = {
  heavy_meat: 'Heavy meat',
  medium_meat: 'Medium meat',
  low_meat: 'Low meat',
  pescatarian: 'Pescatarian',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
};

const PIPELINE = [
  { title: 'Extract', text: 'Gemini turns your free text into validated, structured lifestyle data.' },
  { title: 'Calculate', text: 'Pure functions apply the cited factors below. Missing categories are never guessed.' },
  {
    title: 'Benchmark & rank',
    text: 'Tools compare you with India, global and Paris-aligned levels and rank actions.',
  },
  { title: 'Plan', text: 'Gemini picks and explains the best actions; the server keeps only ids the tools produced.' },
] as const;

const OTHER_FACTORS = [
  { label: 'Grid electricity (India)', value: `${GRID_FACTOR_KG_PER_KWH} kg / kWh`, source: 'CEA CO₂ Baseline v19' },
  {
    label: `LPG (${LPG_CYLINDER_KG} kg cylinder)`,
    value: `${LPG_FACTOR_KG_PER_KG} kg / kg`,
    source: 'IPCC 2006 Guidelines',
  },
  { label: 'Landfill waste', value: `${WASTE_FACTOR_KG_PER_KG} kg / kg`, source: 'DEFRA 2024' },
  { label: 'India average', value: `${BENCHMARKS_TONNES.india_average} t / person / yr`, source: 'Our World in Data' },
  {
    label: 'Global average',
    value: `${BENCHMARKS_TONNES.global_average} t / person / yr`,
    source: 'Our World in Data',
  },
  {
    label: 'Paris-aligned 2030 target',
    value: `${BENCHMARKS_TONNES.paris_2030_target} t / person / yr`,
    source: 'IPCC AR6 1.5 °C pathways',
  },
] as const;

/** Every value rendered here is imported from shared/factors.ts, the same module the calculators use. */
export function MethodologyView() {
  return (
    <m.div className="stack" variants={stagger} initial="hidden" animate="visible">
      <m.section className="card" variants={fadeUp} aria-labelledby="pipeline-heading">
        <h2 id="pipeline-heading" className="card-title">
          How a plan is built
        </h2>
        <ol className="pipeline">
          {PIPELINE.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </m.section>

      <div className="grid-2">
        <m.section className="card" variants={fadeUp} aria-labelledby="transport-heading">
          <h2 id="transport-heading" className="card-title">
            Travel <span className="card-subtitle">DEFRA 2024</span>
          </h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Mode</th>
                  <th scope="col" className="num">
                    kg CO₂e / km
                  </th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(TRANSPORT_FACTORS) as TransportMode[]).map((mode) => (
                  <tr key={mode}>
                    <td>{MODE_LABELS[mode]}</td>
                    <td className="num">{TRANSPORT_FACTORS[mode].toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </m.section>

        <div className="stack">
          <m.section className="card" variants={fadeUp} aria-labelledby="diet-heading">
            <h2 id="diet-heading" className="card-title">
              Diet <span className="card-subtitle">Scarborough et al. 2014</span>
            </h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Diet</th>
                    <th scope="col" className="num">
                      kg CO₂e / day
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(DIET_FACTORS) as Diet[]).map((diet) => (
                    <tr key={diet}>
                      <td>{DIET_LABELS[diet]}</td>
                      <td className="num">{DIET_FACTORS[diet].toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </m.section>
        </div>
      </div>

      <m.section className="card" variants={fadeUp} aria-labelledby="other-heading">
        <h2 id="other-heading" className="card-title">
          Energy, waste and benchmarks
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Factor</th>
                <th scope="col">Value</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {OTHER_FACTORS.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.value}</td>
                  <td className="muted">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="card-footnote">Estimates are averages for guidance, not certification.</p>
      </m.section>
    </m.div>
  );
}
