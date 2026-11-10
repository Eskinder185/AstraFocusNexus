import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Target } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useNow } from "../../hooks/useNow";
import { TaskRow } from "../tasks/TaskRow";
import { useUIActions } from "../../app/ui";
import { useWorkspace, useWorkspaceActions } from "../workspace/WorkspaceProvider";

export const ProjectsPage: React.FC = () => {
  const { projects, tasks, goals, focusSessions } = useWorkspace();
  const { addProject, updateProject, deleteProject } = useWorkspaceActions();
  const { openComposer } = useUIActions();
  const now = useNow();
  const [newTitle, setNewTitle] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = projects.find(p => p.id === selectedId) ?? projects[0];
  const linked = selected ? tasks.filter(t => t.projectId === selected.id) : [];
  const completed = linked.filter(t => t.status === "done").length;
  const focusedMs = linked.reduce((sum, t) => sum + focusSessions.filter(s => s.taskId === t.id).reduce((total, s) => total + s.focusedMs, 0), 0);
  return <div className="projects-page">
    <PageHeader title="Projects" description="Keep related work together. Goals track outcomes; projects organize the work." />
    <div className="projects-layout">
      <aside className="card">
        <div className="card__header"><h2 className="card__title">Your projects</h2></div>
        <div className="card__body">
          <form className="projects-create" onSubmit={e => { e.preventDefault(); if (!newTitle.trim()) return; const p = addProject({ title: newTitle }); setSelectedId(p.id); setNewTitle(""); }}>
            <label htmlFor="project-title" className="visually-hidden">Project name</label>
            <input id="project-title" className="input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Project name" maxLength={200} />
            <button type="submit" className="btn btn--primary" disabled={!newTitle.trim()}><Plus size={16} aria-hidden /> Add</button>
          </form>
          <ul role="list" className="projects-list">
            {projects.map(p => {
              const count = tasks.filter(t => t.projectId === p.id && t.status === "todo").length;
              return <li key={p.id}><button type="button" className={p.id === selected?.id ? "is-active" : ""} onClick={() => setSelectedId(p.id)}>{p.title}<span>{count} open</span></button></li>;
            })}
          </ul>
        </div>
      </aside>
      <section className="card">
        {selected ? <>
          <div className="card__header"><h2 className="card__title">{selected.title}</h2><button type="button" className="btn btn--ghost btn--sm" onClick={() => { if (window.confirm(`Delete project “${selected.title}”? Tasks will be kept.`)) { deleteProject(selected.id); setSelectedId(null); } }}>Delete project</button></div>
          <div className="card__body projects-detail">
            <p className="subtle">{completed} of {linked.length} tasks completed · {Math.round(focusedMs / 60_000)} min focused</p>
            <div className="field"><label className="label" htmlFor="project-notes">Project notes</label><textarea id="project-notes" className="textarea" key={selected.id} defaultValue={selected.notes} onBlur={e => updateProject(selected.id, { notes: e.target.value })} /></div>
            <div className="field"><label className="label" htmlFor="project-date">Target date</label><input id="project-date" type="date" className="input" value={selected.targetDate ?? ""} onChange={e => updateProject(selected.id, { targetDate: e.target.value || null })} /></div>
            <div className="field"><label className="label" htmlFor="project-goal">Related goal</label><select id="project-goal" className="select" value={selected.goalId ?? ""} onChange={e => updateProject(selected.id, { goalId: e.target.value || null })}><option value="">None</option>{goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
            {selected.goalId && <Link to="/goals" className="btn btn--ghost btn--sm"><Target size={14} aria-hidden /> View goals</Link>}
            <div className="row"><h3>Tasks</h3><button type="button" className="btn btn--sm" onClick={() => openComposer({ projectId: selected.id, ...(selected.goalId ? { goalId: selected.goalId } : {}) })}>New task</button></div>
            {linked.length ? <ul role="list" className="task-list">{linked.map(t => <TaskRow key={t.id} task={t} now={now} />)}</ul> : <p className="subtle">No tasks yet. Use New task above, or choose this project in any task’s details.</p>}
          </div>
        </> : <div className="card__body"><p className="subtle">Create a project to organize related tasks.</p></div>}
      </section>
    </div>
  </div>;
};
