import React, { useMemo, useState } from "react";
import type { ParentPet } from "../types";
import { planShiny, type PlacementMode } from "../shinyPlanner";
import { ALL_PET_NAMES } from "../petHelper";

interface Props {
  parents: ParentPet[];
  onUpdate: (id: string, shiny: boolean) => void;
}
export const ShinyPlannerTab: React.FC<Props> = ({ parents, onUpdate }) => {
  const [filter, setFilter] = useState("");
  const [targetsText, setTargetsText] = useState("");
  const [nestCount, setNestCount] = useState(10);
  const [mode, setMode] = useState<PlacementMode>("shared");
  const [showAll, setShowAll] = useState(false);
  const targets = useMemo(() => [...new Set(targetsText.split(/[，,;；\n]/).map(s => s.trim()).filter(Boolean))], [targetsText]);
  const result = useMemo(() => planShiny(parents, targets, nestCount, mode), [parents, targets, nestCount, mode]);
  const filtered = useMemo(() => parents.filter(p => p.sprite && (!filter || p.sprite.includes(filter) || p.position?.includes(filter))), [parents, filter]);
  const visible = showAll ? filtered.slice(0, 200) : filtered.filter(p => p.isShiny).slice(0, 200);
  const existingSpecies = new Set(ALL_PET_NAMES);
  const shinyCount = parents.filter(p => p.isShiny).length;
  return (
    <div className="bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 space-y-5 text-slate-800 dark:text-slate-200">
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-2">
        <h2 className="font-bold text-xl">✨ 异色排窝（本地预览版）</h2>
        <p className="text-sm text-slate-500">当前已导入 {parents.length} 只父母本，已确认异色 {shinyCount} 只。仅使用本地仓库数据计算，不上传任何精灵信息。</p>
        <p className="text-xs text-amber-600 dark:text-amber-400">请先核对异色标记：当前抓包协议的异色字段尚未经过 S5 实测。只识别明确的布尔字段；其他精灵需手动标记。规划仅为蛋组可达性参考，不能保证遗传概率、实际窝点效果和跨代产出。</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h3 className="font-bold">1. 核对仓库异色</h3>
          <div className="flex gap-2">
            <input aria-label="筛选精灵" className="w-full min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" placeholder="搜索精灵名或仓库位置" value={filter} onChange={e => setFilter(e.target.value)} />
            <button className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 text-sm whitespace-nowrap" onClick={() => setShowAll(v => !v)}>{showAll ? "仅看异色" : "查看全部"}</button>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {visible.map(p => (
              <label key={p.id} className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 p-2 cursor-pointer">
                <input type="checkbox" checked={!!p.isShiny} onChange={e => onUpdate(p.id, e.target.checked)} />
                <span className="text-sm font-semibold flex-1">{p.sprite}</span>
                <span className="text-xs text-slate-500">{p.gender} {p.position || ""}</span>
              </label>
            ))}
            {!visible.length && <p className="text-sm text-slate-500">没有可显示的精灵。可点击「查看全部」标记已有异色。</p>}
          </div>
          {filtered.length > 200 && <p className="text-xs text-amber-600">仅展示前 200 条，请输入名称进一步筛选。</p>}
        </section>
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h3 className="font-bold">2. 规划目标</h3>
          <label className="block text-sm">目标精灵（逗号或换行分隔）</label>
          <textarea className="w-full h-28 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" value={targetsText} onChange={e => setTargetsText(e.target.value)} placeholder="例如：喵喵，火花" />
          {targets.filter(t => !existingSpecies.has(t)).length > 0 && <p className="text-xs text-amber-600">以下目标未在当前静态图鉴中发现：{targets.filter(t => !existingSpecies.has(t)).join("、")}。请先补充图鉴后再规划。</p>}
          <label className="block text-sm">可用蛋窝数量</label>
          <input aria-label="可用蛋窝数量" className="rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm w-24" type="number" min={1} max={30} value={nestCount} onChange={e => setNestCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
          <label className="block text-sm">排窝方式</label>
          <select className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" value={mode} onChange={e => setMode(e.target.value as PlacementMode)}>
            <option value="shared">共享异色公本（优先覆盖不同母本）</option>
            <option value="pairs">一对一独立配对</option>
          </select>
        </section>
      </div>
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h3 className="font-bold">3. 推荐摆窝（{result.pairs.length} 组）</h3>
        {!result.pairs.length && <p className="text-sm text-slate-500">没有找到已标记异色且具有共同蛋组的公母配对。请核实性别、异色标记和图鉴蛋组是否齐全。</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {result.pairs.map((pair, index) => (
            <div key={pair.father.id + ":" + pair.mother.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm space-y-1">
              <div className="font-bold">窝位 {index + 1}</div>
              <div>♂ {pair.father.sprite} {pair.father.isShiny ? "✨" : ""} <span className="text-slate-500">{pair.father.position || ""}</span></div>
              <div>♀ {pair.mother.sprite} {pair.mother.isShiny ? "✨" : ""} <span className="text-slate-500">{pair.mother.position || ""}</span></div>
              <div className="text-xs text-slate-500">交集蛋组：{pair.groups.join("、")}</div>
            </div>
          ))}
        </div>
        {result.crossPairWarnings.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">注意：还存在 {result.crossPairWarnings.length} 组潜在交叉配对</summary>
            <div className="max-h-40 overflow-y-auto mt-2 text-xs space-y-1">
              {result.crossPairWarnings.map((p, i) => <div key={i}>{p.father} × {p.mother}（{p.groups.join("、")}）</div>)}
            </div>
          </details>
        )}
      </section>
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h3 className="font-bold">4. 目标异色传递路线（理论蛋组路径）</h3>
        {!targets.length && <p className="text-sm text-slate-500">填写目标后显示可能的蛋组传递路径和缺少的母本。</p>}
        {result.routes.map(route => (
          <div key={route.target} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-sm space-y-1">
            <strong>{route.target}</strong>
            <div>{route.status === "owned" ? "已拥有异色" : route.status === "unknown" ? "缺少图鉴 / 蛋组数据" : route.status === "unreachable" ? "未在搜索范围内找到理论路径（不代表绝对无法孵化）" : route.species.join(" → ")}</div>
            {route.requiresMaleOffspring && <p className="text-amber-600">该路径从异色母体出发，需先取得同种异色公体；还需准备同组公本，实际产出概率尚未验证。</p>}
            {route.missingMothers.length > 0 && <p className="text-amber-600">尚未在已导入仓库中找到对应母本：{route.missingMothers.join("、")}</p>}
          </div>
        ))}
        {result.unknownSpecies.length > 0 && <p className="text-xs text-amber-600">有 {result.unknownSpecies.length} 种仓库精灵缺少有效蛋组，已排除于配对计算之外：{result.unknownSpecies.slice(0, 15).join("、")}{result.unknownSpecies.length > 15 ? "……" : ""}</p>}
      </section>
    </div>
  );
};
