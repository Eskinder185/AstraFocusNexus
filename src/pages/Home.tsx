import React from "react";
type Priority = "UI" | "UN" | "NI" | "NN";
type Filter = "all" | "active" | "completed";
interface Task{ id:number; text:string; completed:boolean; createdAt:number; dueAt?:string; remind?:boolean; notified?:boolean; pomos?:number; priority?:Priority; goalId?:number|null; }
interface Props{
  input:string; setInput:(v:string)=>void; dueAt:string; setDueAt:(v:string)=>void;
  remind:boolean; setRemind:(v:boolean)=>void; addTask:()=>void; requestPermission:()=>void;
  activeTaskId:number|null; setActiveTaskId:(id:number|null)=>void; tasks:Task[]; filteredTasks:Task[];
  filter:Filter; setFilter:(f:Filter)=>void; toggleTask:(id:number)=>void; removeTask:(id:number)=>void;
  clearCompleted:()=>void; remaining:number; priorityPref:Priority; setPriorityPref:(p:Priority)=>void;
  setTaskPriority:(id:number,p:Priority)=>void; pomoRunning:boolean;
}

const Home:React.FC<Props>= (p) => (
  <>
    <h1 className="title">Task Tracker <span className="badge">✨</span></h1>
    <div className="card">
      <div className="row" style={{gap:8,flexWrap:"wrap"}}>
        <input className="input" value={p.input} placeholder="Enter a task"
          onChange={e=>p.setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&p.addTask()} />
        <input className="input" style={{minWidth:220}} type="datetime-local" value={p.dueAt} onChange={e=>p.setDueAt(e.target.value)} />
      </div>
      
      <div className="row" style={{gap:8,flexWrap:"wrap",marginTop:8}}>
        <label style={{display:"flex",alignItems:"center",gap:6}}>
          <input type="checkbox" checked={p.remind} onChange={e=>p.setRemind(e.target.checked)} /> Remind me
        </label>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span>Priority:</span>
          <div className="pill-group priority-pills">
            {(["UI","UN","NI","NN"] as Priority[]).map(pr => (
              <button key={pr}
                className={`pill small ${p.priorityPref===pr?"active":""}`}
                onClick={()=>p.setPriorityPref(pr)}
                title={pr==="UI"?"Urgent + Important":pr==="UN"?"Urgent + Not Important":pr==="NI"?"Not Urgent + Important":"Not Urgent + Not Important"}
              >{pr}</button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="row" style={{gap:8,flexWrap:"wrap",marginTop:8}}>
        <button className="btn" onClick={p.addTask}>Add Task</button>
        <button className="btn" onClick={p.requestPermission}>Enable Notifications</button>
      </div>
    </div>

    <div className="controls">
      <div className="filters">
        <button className={`chip ${p.filter==="all"?"active":""}`} onClick={()=>p.setFilter("all")}>All</button>
        <button className={`chip ${p.filter==="active"?"active":""}`} onClick={()=>p.setFilter("active")}>Active</button>
        <button className={`chip ${p.filter==="completed"?"active":""}`} onClick={()=>p.setFilter("completed")}>Completed</button>
      </div>
      <div className="meta">
        <span>{p.remaining} left</span>
        <button className="link" onClick={p.clearCompleted} disabled={p.tasks.every(t=>!t.completed)}>Clear completed</button>
      </div>
    </div>

    {p.filteredTasks.length===0? <p className="empty empty--prompt">✨ Add your first task above to get started! <span className="arrow-up">⬆️</span></p> :
      <ul className="list">
        {p.filteredTasks.map(task=>(
          <li className={`item ${p.activeTaskId===task.id && p.pomoRunning?"pomo-active":""}`} key={task.id}>
            <div style={{display:"flex",alignItems:"flex-start",gap:8,width:"100%"}}>
              <input type="checkbox" checked={task.completed} onChange={()=>p.toggleTask(task.id)} title="Toggle complete"/>
              <span className={`text ${task.completed?"done":""}`} style={{flex:1}}>
                {task.text}
                {task.dueAt && <small style={{display:"block",marginTop:4,color:"#475569"}}>(due {new Date(task.dueAt).toLocaleString()})</small>}
                {task.remind && !task.notified && <small style={{display:"block",marginTop:2}}> • will remind</small>}
                {task.remind && task.notified && <small style={{display:"block",marginTop:2}}> • reminded</small>}
                {typeof task.pomos==="number" && task.pomos>0 && <small style={{display:"block",marginTop:2,color:"#475569"}}> ⏱️ {task.pomos} pomos</small>}
              </span>
            </div>
            
            <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",justifyContent:"space-between",marginTop:8}}>
              <div className="pill-group priority-pills" title="Eisenhower priority">
                {(["UI","UN","NI","NN"] as Priority[]).map(pr => (
                  <button key={pr} className={`pill small ${((task.priority ?? "NN")===pr)?"active":""}`}
                    onClick={()=>p.setTaskPriority(task.id, pr)}>{pr}</button>
                ))}
              </div>
              
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <button className={`pill ${p.activeTaskId===task.id?"active":""}`} onClick={()=>p.setActiveTaskId(p.activeTaskId===task.id?null:task.id)} title="Set as active for Pomodoro">🎯 Focus</button>
                <button className="icon" onClick={()=>p.removeTask(task.id)} aria-label="Delete">🗑️</button>
              </div>
            </div>
          </li>
        ))}
      </ul>}
  </>
);
export default Home;

