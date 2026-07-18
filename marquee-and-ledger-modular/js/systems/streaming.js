export function calcNetflixPayout(movie){
    return movie.totalBoxOffice*(0.10 + (movie.audienceScore/100)*0.15);
  }

export function calcPrimePayout(movie){
    var qualityFactor = 1 + movie.quality/100*1.2;
    var week1 = movie.totalBoxOffice*0.02*qualityFactor;
    var week2 = week1*qualityFactor;
    var week3 = week2*qualityFactor*0.7;
    var week4 = week3*qualityFactor*0.7;
    return { total: week1+week2+week3+week4, weeks:[week1,week2,week3,week4] };
  }

export function cultStreamEligible(movie){
    return movie.criticsScore>80 && movie.totalBoxOffice<5000000;
  }

export function computeStreamingRevenue(movie, platform){
    if(platform==='netflix') return { amount: calcNetflixPayout(movie), breakdown:null };
    if(platform==='prime'){ var r = calcPrimePayout(movie); return { amount:r.total, breakdown:r.weeks }; }
    if(platform==='cultstream') return { amount: cultStreamEligible(movie) ? 2000000 : 0, breakdown:null };
    return { amount:0, breakdown:null };
  }

