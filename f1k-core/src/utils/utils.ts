export function ab2str(e: ArrayBuffer): string {
	// recheck Array.from on real data
    return String.fromCharCode.apply(null, Array.from(new Uint8Array(e)));
}

export function formatLapTime(e: number, t: number = 3, a = 0): string {
    if (isNaN(e))
        return " ";
    if (e <= 0)
        return " ";
    null == t && (t = 3);
    let r = ""
      , s = ""
      , l = ""
      , i = 0
      , o = 0
      , n = 0;
    return (e = 1e3 * +parseFloat((e / 1e3) + '').toFixed(t)) >= 36e5 ? s = (i = Math.floor(e / 36e5)) + ":" : 1 == a && (s = "0:"),
    e >= 6e4 ? (l = (o = Math.floor(e % 36e5 / 6e4)) + ":",
    (i > 0 || a) && o < 10 && (l = "0" + l)) : 1 == a && (l = "00:"),
    n = e % 6e4 / 1e3,
    r = parseFloat((e % 6e4 / 1e3) + '').toFixed(t) + "",
    (o > 0 || a) && n < 10 && (r = "0" + r),
    s + l + r
}

export function formatDayTime(e: any, t: boolean): string {
    let a = new Date(1e3 * e)
      , r = a.getHours() + '';
    +r < 10 && (r = "0" + r);
    let s = "0" + a.getMinutes()
      , l = "0" + a.getSeconds()
      , i = r + ":" + s.substr(-2);
    return t && (i += ":" + l.substr(-2)),
    i
}
