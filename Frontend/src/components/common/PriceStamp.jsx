import { formatMoney } from "../../utils/format";

export function PriceStamp({ amount }) {
  return <span className="price-stamp">{formatMoney(amount)}/mo</span>;
}
