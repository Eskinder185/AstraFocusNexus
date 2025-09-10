import React from "react";
type Priority="UI"|"UN"|"NI"|"NN";
interface Task{ id:number; text:string; completed:boolean; priority?:Priority; }
interface Props{ tasks:Task[]; toggleTask:(id:number)=>void; setTaskPriority:(id:number,p:Priority)=>void; }
const labels:Record<Priority,string>={UI:"Urgent + Important",UN:"Urgent + Not Important",NI:"Not Urgent + Important",NN:"Not Urgent + Not Important"};
const quadrants:Priority[]=["UI","UN","NI","NN"];
const Matrix:React.FC<Props>=({tasks,toggleTask,setTaskPriority})=>(
  <div className="matrix">
    {quadrants.map(q=>{
      const items=tasks.filter(t=>(t.priority??"NN")===q);
      return (
        <div key={q} className="matrix-cell">
          <div className="matrix-title">{labels[q]}</div>
          <ul className="list" style={{marginTop:6}}>
            {items.length===0? <li className="item"><span className="text muted">No tasks.</span></li> :
              items.map(t=>(
                <li key={t.id} className="item">
                  <input type="checkbox" checked={t.completed} onChange={()=>toggleTask(t.id)} title="Toggle complete"/>
                  <span className={`text ${t.completed?"done":""}`}>{t.text}</span>
                  {!t.completed && (
                    <div style={{display:"flex",gap:6,alignItems:"center",marginLeft:"auto"}}>
                      {quadrants.map(opt=>(
                        <button key={opt} className={`pill ${((t.priority??"NN")===opt && "active")||""}`} onClick={()=>setTaskPriority(t.id,opt)} title={labels[opt]}>{opt}</button>
                      ))}
                    </div>
                  )}
                </li>
              ))
            }
          </ul>
        </div>
      );
    })}
  </div>
);
export default Matrix;
