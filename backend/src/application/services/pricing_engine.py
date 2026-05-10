from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP


@dataclass
class PriceSuggestionData:
    product_id: int
    product_title: str
    current_price: Decimal
    suggested_price: Decimal
    change_percent: Decimal
    direction: str
    confidence: Decimal
    reasoning: str
    demand_trend: str
    data_period_days: int = 30
    insufficient_data: bool = False


def _compute_slope(values: list[float]) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    x_mean = (n - 1) / 2.0
    y_mean = sum(values) / n
    numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    denominator = sum((i - x_mean) ** 2 for i in range(n))
    return numerator / denominator if denominator else 0.0


class PricingEngine:
    INSUFFICIENT_DATA_THRESHOLD = 10
    SLOPE_RISING = 0.1
    SLOPE_DECLINING = -0.1
    MAX_INCREASE_PCT = 15.0
    MAX_DECREASE_PCT = -10.0

    def compute(
        self,
        product_id: int,
        product_title: str,
        current_price: Decimal,
        daily_counts: list[int],
        total_orders: int,
    ) -> PriceSuggestionData:
        if total_orders < self.INSUFFICIENT_DATA_THRESHOLD:
            return PriceSuggestionData(
                product_id=product_id,
                product_title=product_title,
                current_price=current_price,
                suggested_price=current_price,
                change_percent=Decimal("0.00"),
                direction="maintain",
                confidence=Decimal("0.00"),
                reasoning="Not enough order data to generate a reliable suggestion.",
                demand_trend="stable",
                data_period_days=30,
                insufficient_data=True,
            )

        slope = _compute_slope([float(c) for c in daily_counts])

        if slope > self.SLOPE_RISING:
            demand_trend = "rising"
            delta = min(slope * 2.0, self.MAX_INCREASE_PCT)
            direction = "increase"
            reasoning = (
                "Demand has been rising over the last 30 days. "
                "A modest price increase may improve revenue without reducing volume."
            )
        elif slope < self.SLOPE_DECLINING:
            demand_trend = "declining"
            delta = max(slope * 2.0, self.MAX_DECREASE_PCT)
            direction = "decrease"
            reasoning = (
                "Demand has been declining over the last 30 days. "
                "A price reduction may help recover sales volume."
            )
        else:
            demand_trend = "stable"
            delta = 0.0
            direction = "maintain"
            reasoning = "Demand has been stable over the last 30 days. Current price appears optimal."

        confidence_raw = min(total_orders / 30.0, 1.0)
        confidence = Decimal(str(round(confidence_raw, 2)))

        multiplier = Decimal(str(1.0 + delta / 100.0))
        suggested_price = (current_price * multiplier).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        if current_price:
            change_pct = (
                (suggested_price - current_price) / current_price * 100
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        else:
            change_pct = Decimal("0.00")

        return PriceSuggestionData(
            product_id=product_id,
            product_title=product_title,
            current_price=current_price,
            suggested_price=suggested_price,
            change_percent=change_pct,
            direction=direction,
            confidence=confidence,
            reasoning=reasoning,
            demand_trend=demand_trend,
            data_period_days=30,
            insufficient_data=False,
        )
