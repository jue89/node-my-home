module.exports = function (hour, schedule) {
	// Make sure all points are in order
	const points = schedule.sort((a, b) => {
		if (a[0] > b[0]) return 1;
		if (a[0] < b[0]) return -1;
		return 0;
	});

	// Current hour
	if (hour instanceof Date) hour = hour.getHours() + hour.getMinutes() / 60;

	// Find the right interval
	let i2;
	for (i2 = 0; i2 < points.length; i2++) if (points[i2][0] >= hour) break;
	if (i2 === points.length) i2 = 0;
	let i1 = i2 - 1;
	if (i1 < 0) i1 = points.length - 1;

	// Interpolate value
	let [x1, y1] = points[i1];
	let [x2, y2] = points[i2];
	// We wrapped around the clock
	if (i1 >= i2) {
		if (hour >= x1) x2 += 24
		else x1 -= 24;
	}
	const m = (y2 - y1) / (x2 - x1);
	const b = (x2 * y1 - x1 * y2) / (x2 - x1);

	return m * hour + b;
}
