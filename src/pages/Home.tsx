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
  setTaskPriority:(id:number,p:Priority)=>void;
}
const Home:React.FC<Props>= (p) => (
  <>
    <h1 className="title">Task Tracker <span className="badge">?</span></h1>
    <div className="row card" style={{gap:8,flexWrap:"wrap"}}>
      <input className="input" value={p.input} placeholder="Enter a task"
        onChange={e=>p.setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&p.addTask()} />
      <input className="input" style={{minWidth:220}} type="datetime-local" value={p.dueAt} onChange={e=>p.setDueAt(e.target.value)} />
      <label style={{display:"flex",alignItems:"center",gap:6}}>
        <input type="checkbox" checked={p.remind} onChange={e=>p.setRemind(e.target.checked)} /> Remind me
      </label>
      <label style={{display:"flex",alignItems:"center",gap:6}}>
        Priority:
        <select value={p.priorityPref} onChange={e=>p.setPriorityPref(e.target.value as Priority)}>
          <option value="UI">Urgent + Important</option><option value="UN">Urgent + Not Important</option>
          <option value="NI">Not Urgent + Important</option><option value="NN">Not Urgent + Not Important</option>
        </select>
      </label>
      <button className="btn" onClick={p.addTask}>Add Task</button>
      <button className="btn" onClick={p.requestPermission}>Enable Notifications</button>
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

    {p.filteredTasks.length===0? <p className="empty">No tasks here yet.</p> :
      <ul className="list">
        {p.filteredTasks.map(task=>(
          <li className="item" key={task.id}>
            <input type="checkbox" checked={task.completed} onChange={()=>p.toggleTask(task.id)} title="Toggle complete"/>
            <span className={`text ${task.completed?"done":""}`}>
              {task.text}
              {task.dueAt && <small style={{marginLeft:8,color:"#475569"}}>(due {new Date(task.dueAt).toLocaleString()})</small>}
              {task.remind && !task.notified && <small> • will remind</small>}
              {task.remind && task.notified && <small> • reminded</small>}
              {typeof task.pomos==="number" && task.pomos>0 && <small style={{marginLeft:8,color:"#475569"}}>• {task.pomos} pomos</small>}
            </span>
            <select value={task.priority ?? "NN"} onChange={e=>p.setTaskPriority(task.id, e.target.value as Priority)} title="Eisenhower priority" style={{marginRight:8}}>
              <option value="UI">UI</option><option value="UN">UN</option><option value="NI">NI</option><option value="NN">NN</option>
            </select>
            <button className={`pill ${p.activeTaskId===task.id?"active":""}`} onClick={()=>p.setActiveTaskId(p.activeTaskId===task.id?null:task.id)} title="Set as active for Pomodoro">?? Focus</button>
            <button className="icon" onClick={()=>p.removeTask(task.id)} aria-label="Delete">?</button>
          </li>
        ))}
      </ul>}
  </>
);
export default Home;
