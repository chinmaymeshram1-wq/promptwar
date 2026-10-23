import type { PlanAction } from '../../../shared/schemas';
import { CATEGORY_LABELS, COST_LABELS, EFFORT_LABELS, formatKg } from '../../format';

/** The ranked action plan as an accessible data table (scrolls horizontally on narrow screens). */
export function ActionTable({ actions }: { actions: readonly PlanAction[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Action</th>
            <th scope="col">Category</th>
            <th scope="col">Effort</th>
            <th scope="col">Cost</th>
            <th scope="col" className="num">
              Saving / yr
            </th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action) => (
            <tr key={action.id}>
              <td>
                <div className="action-title">{action.title}</div>
                {action.note && <div className="action-note">{action.note}</div>}
              </td>
              <td>{CATEGORY_LABELS[action.category]}</td>
              <td>{EFFORT_LABELS[action.effort]}</td>
              <td>{COST_LABELS[action.costHint]}</td>
              <td className="num saving">−{formatKg(action.savingKgPerYear)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
