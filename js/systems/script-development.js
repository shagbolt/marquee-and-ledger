export function countKeywordHits(lowerText, list){
    var count = 0;
    (list||[]).forEach(function(k){ if(lowerText.indexOf(k)>-1) count++; });
    return count;
  }

export function uniqueWordRatioOf(text){
    var words = text.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(Boolean);
    if(words.length===0) return 0.5;
    var seen = {};
    words.forEach(function(w){ seen[w]=true; });
    return Object.keys(seen).length/words.length;
  }

export var THEME_BANK = [
    {label:'Redemption', words:['redeem','redemption','forgive','second chance','atone']},
    {label:'Revenge', words:['revenge','vengeance','avenge','payback']},
    {label:'Love & Romance', words:['love','romance','falls for','affair','soulmate']},
    {label:'Family', words:['family','father','mother','sister','brother','daughter','son','sibling']},
    {label:'War & Conflict', words:['war','battle','soldier','army','combat']},
    {label:'Identity', words:['identity','who she is','who he is','discovers who','true self']},
    {label:'Power & Corruption', words:['power','corrupt','control','tyrant','regime']},
    {label:'Survival', words:['survive','survival','alone','trapped','stranded']},
    {label:'Justice', words:['justice','truth','the law','wrongly accused']},
    {label:'Sacrifice', words:['sacrifice','gives up everything','dies for']},
    {label:'Friendship', words:['friendship','friends','loyal','bond','ally']},
    {label:'Grief & Loss', words:['grief','loss','mourn','passed away']},
    {label:'Hope', words:['hope','dream of','the future','believe in']},
    {label:'Betrayal', words:['betray','betrayal','deceive','lied to','backstab']}
  ];

export var TONE_BANK = [
    {label:'Dark & Gritty', words:['dark','grim','brutal','violent','nightmare','bleak']},
    {label:'Light & Playful', words:['funny','hilarious','charming','delightful','quirky','wacky']},
    {label:'Epic & Sweeping', words:['epic','legendary','vast','empire','saga','ancient','destiny']},
    {label:'Intimate & Personal', words:['quiet','intimate','personal','small town','whisper']}
  ];

export var CLICHE_PHRASES = ['chosen one','against all odds','one last job','one-man army','in a world where','last hope','ragtag group','unlikely hero','ancient prophecy','save the world','saves the world','fight for survival'];

export var INTERIORITY_WORDS = ['feels','realizes','struggles','fears','desires','believes','doubts','remembers','regrets','hopes','wonders','questions','torn between','must choose','confronts her past','confronts his past'];

export var SPECTACLE_WORDS = ['explosion','chase','battle','adventure','magic','monster','escape','heist','race against','showdown','rescue'];

export var WORLDBUILDING_WORDS = ['world','universe','kingdom','empire','galaxy','realm','dynasty','civilization','colony'];

export var TARGET_AUDIENCE_MAP = {
    'Action':'Broad 18-49, skews male', 'Animation':'Family / All Ages', 'Comedy':'Broad 18-54',
    'Drama':'Adults 25-54, awards-attentive', 'Horror':'Young Adults 17-34', 'Sci-Fi':'Genre enthusiasts 18-44'
  };

