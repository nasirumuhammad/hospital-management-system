const PATTERNS: Record<string,string> = {
  '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
  A:'wnnnnwnnw',B:'nnwnnwnnw',C:'wnwnnwnnn',D:'nnnnwwnnw',E:'wnnnwwnnn',F:'nnwnwwnnn',G:'nnnnnwwnw',H:'wnnnnwwnn',I:'nnwnnwwnn',J:'nnnnwwwnn',
  K:'wnnnnnnww',L:'nnwnnnnww',M:'wnwnnnnwn',N:'nnnnwnnww',O:'wnnnwnnwn',P:'nnwnwnnwn',Q:'nnnnnnwww',R:'wnnnnnwwn',S:'nnwnnnwwn',T:'nnnnwnwwn',
  U:'wwnnnnnnw',V:'nwwnnnnnw',W:'wwwnnnnnn',X:'nwnnwnnnw',Y:'wwnnwnnnn',Z:'nwwnwnnnn','-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn','*':'nwnnwnwnn'
};
export function Code39Barcode({value}:{value:string}){
  const encoded=`*${value.toUpperCase()}*`;
  if([...encoded].some((character)=>!PATTERNS[character])) return <span>{value}</span>;
  let x=0; const bars:Array<{x:number;width:number}>=[];
  [...encoded].forEach((character,index)=>{
    const pattern=PATTERNS[character];
    [...pattern].forEach((width,index2)=>{const units=width==='w'?3:1;if(index2%2===0)bars.push({x,width:units});x+=units;});
    if(index<encoded.length-1)x+=1;
  });
  return <svg role="img" aria-label={`Barcode ${value}`} viewBox={`0 0 ${x} 38`} width="100%" height="48" preserveAspectRatio="xMinYMid meet">{bars.map((bar,i)=><rect key={i} x={bar.x} y="0" width={bar.width} height="27" fill="currentColor"/>)}<text x={x/2} y="36" textAnchor="middle" fontSize="7" fill="currentColor">{value}</text></svg>;
}
