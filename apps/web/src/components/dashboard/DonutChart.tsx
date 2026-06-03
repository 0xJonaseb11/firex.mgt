import type { ChartSegment } from "@web/api/types";

interface DonutChartProps {
	title: string;
	segments: ChartSegment[];
	emptyLabel?: string;
}

export function DonutChart({
	title,
	segments,
	emptyLabel = "No data yet",
}: DonutChartProps) {
	const total = segments.reduce((sum, s) => sum + s.value, 0);
	const hasData = total > 0;

	let acc = 0;
	const gradient = hasData
		? segments
				.map((segment) => {
					const start = (acc / total) * 100;
					acc += segment.value;
					const end = (acc / total) * 100;
					return `${segment.color} ${start}% ${end}%`;
				})
				.join(", ")
		: "#e5e7eb";

	return (
		<article className="chart-panel">
			<h3 className="chart-panel__title">{title}</h3>
			{!hasData ? (
				<p className="chart-panel__empty">{emptyLabel}</p>
			) : (
				<div className="donut-chart">
					<div
						className="donut-chart__ring"
						style={{ background: `conic-gradient(${gradient})` }}
					>
						<div className="donut-chart__hole">
							<span className="donut-chart__total">{total}</span>
							<span className="donut-chart__caption">total</span>
						</div>
					</div>
					<ul className="donut-chart__legend">
						{segments.map((segment) => (
							<li key={segment.label}>
								<span
									className="donut-chart__swatch"
									style={{ backgroundColor: segment.color }}
								/>
								<span>
									{segment.label} ({segment.value})
								</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</article>
	);
}
