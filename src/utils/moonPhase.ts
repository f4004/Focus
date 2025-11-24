export const getMoonPhase = (date: Date): number => {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();

    if (month < 3) {
        year--;
        month += 12;
    }

    ++month;

    let c = 365.25 * year;
    let e = 30.6 * month;
    let jd = c + e + day - 694039.09; // jd is total days elapsed
    jd /= 29.5305882; // divide by the moon cycle
    let b = parseInt(jd.toString()); // int(jd) -> b, take integer part of jd
    jd -= b; // subtract integer part to leave fractional part of original jd
    b = Math.round(jd * 8); // scale fraction from 0-8 and round

    if (b >= 8) b = 0; // 0 and 8 are the same so turn 8 into 0

    return b;
};

export const getMoonPhaseName = (phase: number): string => {
    switch (phase) {
        case 0: return 'New Moon';
        case 1: return 'Waxing Crescent';
        case 2: return 'First Quarter';
        case 3: return 'Waxing Gibbous';
        case 4: return 'Full Moon';
        case 5: return 'Waning Gibbous';
        case 6: return 'Last Quarter';
        case 7: return 'Waning Crescent';
        default: return 'Unknown';
    }
};
