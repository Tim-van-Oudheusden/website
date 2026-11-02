import "./pipeline.css";

import type { CSSProperties, JSX } from "react";

import type { FlowStepId } from "../config/agentic-copy";
import { AGENTIC_COPY, AGENTIC_LINKS } from "../config/agentic-copy";
import type { HiveStatusView, HiveViewModel } from "../lib/hive-view-model";

import { Stations } from "./pipeline-stations";

interface Readout {
  value: string;
  unit: string;
}

/** The live number shown under each flow step, or null when its part is missing. */
function readouts(model: HiveViewModel): Record<FlowStepId, Readout | null> {
  const { hive, repo } = model;

  return {
    issue: hive === null ? null : { value: String(hive.work.issues), unit: "issues open now" },
    agent: hive === null
      ? null
      : { value: `${String(hive.agents.running)}/${String(hive.agents.total)}`, unit: "agents running" },
    pullRequest: repo === null ? null : { value: String(repo.totals.opened), unit: "PRs opened in 7 days" },
    checks: hive === null ? null : { value: String(hive.work.mergeable), unit: "ready to merge now" },
    merge: repo === null ? null : { value: String(repo.totals.merged), unit: "merged in 7 days" },
  };
}

const INLETS = [40, 95, 150, 205, 260];

/** Decoration: five inlets merging into one station and flowing on to live. */
function Manifold(): JSX.Element {
  return (
    <svg className="pl-manifold" viewBox="0 0 520 300" aria-hidden="true" focusable="false">
      {INLETS.map((y) => (
        <path key={y} className="pl-manifold-inlet" d={`M0 ${String(y)} C 150 ${String(y)}, 170 150, 290 150`} />
      ))}
      <path className="pl-manifold-main" d="M290 150 H 470" />
      {INLETS.map((y) => <circle key={y} className="pl-manifold-dot" cx="0" cy={y} r="5" />)}
      <circle className="pl-manifold-hub" cx="290" cy="150" r="18" />
      <circle className="pl-manifold-hub-core" cx="290" cy="150" r="7" />
      <circle className="pl-manifold-end" cx="482" cy="150" r="12" />
    </svg>
  );
}

function Route({ model }: { model: HiveViewModel }): JSX.Element {
  const values = readouts(model);

  return (
    <ol className="pl-route" aria-label="How a change goes from issue to live">
      {AGENTIC_COPY.flow.map((entry, index) => {
        const readout = values[entry.id];

        return (
          <li key={entry.step} className="pl-stop" style={{ "--pl-i": index } as CSSProperties}>
            <span className="pl-stop-node" aria-hidden="true">
              <span>{String(index + 1).padStart(2, "0")}</span>
            </span>
            <span className="pl-conduit" aria-hidden="true" />
            <div className="pl-stop-body">
              <p className="pl-stop-step">{entry.step}</p>
              <p className="pl-stop-text">{entry.text}</p>
              {readout === null
                ? null
                : (
                    <p className="pl-readout">
                      <span className="pl-readout-value">{readout.value}</span>
                      <span className="pl-readout-unit">{readout.unit}</span>
                    </p>
                  )}
            </div>
          </li>
        );
      })}
      <li className="pl-terminal" aria-hidden="true">
        <span className="pl-terminal-node">live</span>
      </li>
    </ol>
  );
}

function Status({ status }: { status: HiveStatusView }): JSX.Element {
  return (
    <p className="pl-status" data-kind={status.kind}>
      <span className="pl-status-light" aria-hidden="true" />
      <span className="pl-status-label" aria-live="polite">{status.label}</span>
      {status.detail === null
        ? null
        : (
            <span className="pl-status-detail">
              {status.at === null ? status.detail : <time dateTime={status.at}>{status.detail}</time>}
            </span>
          )}
    </p>
  );
}

function Footer(): JSX.Element {
  return (
    <footer className="pl-footer">
      <span className="pl-footer-node" aria-hidden="true" />
      <div>
        <p>
          {"Hive is an open-source agent orchestrator: "}
          <a className="pl-link" href={AGENTIC_LINKS.hive.href}>{AGENTIC_LINKS.hive.label}</a>
          {". How it works on this repo: "}
          <a className="pl-link" href={AGENTIC_LINKS.multiAgent.href}>{AGENTIC_LINKS.multiAgent.label}</a>
          .
        </p>
        <p className="pl-privacy">{AGENTIC_COPY.privacy}</p>
      </div>
    </footer>
  );
}

/** The Agentic page as one flow of work, issue to live, each stage a glowing station on a honey conduit. */
export function PipelineView({ model }: { model: HiveViewModel }): JSX.Element {
  return (
    <div className="agx-pipeline" data-status={model.status.kind}>
      <div className="pl-shell">
        <header className="pl-hero">
          <p className="pl-eyebrow" aria-hidden="true">
            <span>issue</span>
            <span className="pl-eyebrow-flow" />
            <span>live</span>
          </p>
          <h1 className="pl-title">{AGENTIC_COPY.title}</h1>
          <p className="pl-intro">{AGENTIC_COPY.intro}</p>
          <Manifold />
        </header>
        <Route model={model} />
        <section className="pl-hive" aria-labelledby="pl-hive-heading">
          <div className="pl-hive-head">
            <div>
              <h2 id="pl-hive-heading" className="pl-h2">{AGENTIC_COPY.hiveHeading}</h2>
              <p className="pl-hive-intro">{AGENTIC_COPY.hiveIntro}</p>
            </div>
            <Status status={model.status} />
          </div>
          {model.fallback === null
            ? <Stations model={model} />
            : <p className="pl-fallback">{model.fallback}</p>}
        </section>
        <Footer />
      </div>
    </div>
  );
}
