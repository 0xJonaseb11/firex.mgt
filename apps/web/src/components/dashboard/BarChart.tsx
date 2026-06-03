import type { ChartSegment } from "@web/api/types";

interface BarChartProps {
	title: string;
	segments: ChartSegment[];
	emptyLabel?: string;
	showZeros?: boolean;
}

export function BarChart({
	title,
	segments,
	emptyLabel = "No data yet",
	showZeros = false,
}: BarChartProps) {
	const visible = showZeros
		? segments
		: segments.filter((segment) => segment.value > 0);
	const peak = Math.max(...visible.map((s) => s.value), 1);
	const hasData = visible.some((s) => s.value > 0);

	return (
		<article className="chart-panel">
			<h3 className="chart-panel__title">{title}</h3>
			{!hasData ? (
				<p className="chart-panel__empty">{emptyLabel}</p>
			) : (
				<div className="bar-chart">
					{visible.map((segment) => (
						<div key={segment.label} className="bar-chart__row">
							<span className="bar-chart__label">{segment.label}</span>
							<div className="bar-chart__track">
								<div
									className="bar-chart__fill"
									style={{
										width: `${(segment.value / peak) * 100}%`,
										backgroundColor: segment.color,
									}}
								/>
							</div>
							<span className="bar-chart__value">{segment.value}</span>
						</div>
					))}
				</div>
			)}
		</article>
	);
}
