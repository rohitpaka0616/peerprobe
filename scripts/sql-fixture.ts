import {writeFileSync} from 'node:fs';
import {seed} from '../lib/seed';
import {mutate} from '../lib/domain';
import {TESTER} from '../lib/model';
const s=seed();const user={id:TESTER,name:'Jamie'};
const result=mutate(s,user,{type:'claim',payload:{taskId:'rent-split'}}) as {sessionId:string};
mutate(s,user,{type:'report',payload:{sessionId:result.sessionId,step:1,title:'Rent bug',reproduce:'Change to 3',expected:'800',actual:'1200',browser:'Test',requestId:'33333333-3333-4333-8333-333333333333'}});
writeFileSync('/private/tmp/peerprobe-fixture.sql',`set role service_role;\nselect public.peerprobe_commit(0, $fixture$${JSON.stringify(s)}$fixture$::jsonb);\nreset role;\n`);
