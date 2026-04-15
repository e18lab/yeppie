import { useCallback, useEffect, useState } from "react";
import { deleteJson, getJson, patchJson, postJson } from "../../api/client";
import { getToken } from "../../auth/token";

type Project = {
  id: number;
  name: string;
  repoUrl: string | null;
  branch: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  githubRepoFullName?: string | null;
  githubLinked?: boolean;
  deploySubdomain?: string | null;
  deployBaseDomain?: string | null;
  deployFullHost?: string | null;
  deployHookUrl?: string | null;
  deployHookSecret?: string | null;
  autoDeployEnabled?: boolean;
  lastDeployAt?: string | null;
  lastDeployStatus?: string | null;
  lastDeploySha?: string | null;
};

type ListRes = { ok?: boolean; projects: Project[] };
type OneRes = { ok?: boolean; project: Project };
type GithubStatusRes = {
  ok?: boolean;
  connected?: boolean;
  login?: string | null;
  deployDefaultDomain?: string | null;
  /** Шаблон URL с `{projectId}` — из YEPPIE_DEPLOY_HOOK_URL_TEMPLATE на API */
  deployHookUrlTemplate?: string | null;
};

function slugifySubdomain(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "app";
}
type GithubRepo = {
  full_name: string;
  name: string;
  default_branch: string;
  html_url: string;
};
type GithubReposRes = { ok?: boolean; repos: GithubRepo[] };
type DeployTriggerRes = {
  ok?: boolean;
  deploy?: { ok: boolean; status?: string; error?: string };
};

const emptyForm = () => ({
  name: "",
  repoUrl: "",
  branch: "main",
  notes: "",
});

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createBusy, setCreateBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [edit, setEdit] = useState(emptyForm);
  const [saveBusy, setSaveBusy] = useState(false);

  const [gh, setGh] = useState<GithubStatusRes | null>(null);
  const [deployOpenId, setDeployOpenId] = useState<number | null>(null);
  const [repoQuery, setRepoQuery] = useState("");
  const [repoList, setRepoList] = useState<GithubRepo[]>([]);
  const [reposBusy, setReposBusy] = useState(false);
  const [linkRepoInput, setLinkRepoInput] = useState("");
  const [syncDefaultBranch, setSyncDefaultBranch] = useState(true);
  const [linkBusy, setLinkBusy] = useState(false);
  const [deployForm, setDeployForm] = useState({
    deploySubdomain: "",
    deployBaseDomain: "",
    deployHookUrl: "",
    autoDeployEnabled: false,
  });
  const [deploySaveBusy, setDeploySaveBusy] = useState(false);
  const [deployTriggerBusy, setDeployTriggerBusy] = useState(false);

  const [createRepoQuery, setCreateRepoQuery] = useState("");
  const [createRepoList, setCreateRepoList] = useState<GithubRepo[]>([]);
  const [createReposBusy, setCreateReposBusy] = useState(false);
  const [pendingGithubFullName, setPendingGithubFullName] = useState<string | null>(
    null
  );
  const [autoLinkGithubOnCreate, setAutoLinkGithubOnCreate] = useState(true);

  const load = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    setLoadErr(null);
    try {
      const projRes = await getJson<ListRes>("/api/yeppie/projects", { token: t });
      setProjects(projRes.projects ?? []);
      try {
        const ghRes = await getJson<GithubStatusRes>("/api/yeppie/github/status", {
          token: t,
        });
        setGh(ghRes);
      } catch {
        setGh({ connected: false, deployDefaultDomain: null });
      }
    } catch (e: unknown) {
      setLoadErr(e instanceof Error ? e.message : "Не удалось загрузить проекты");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = getToken();
    if (!t || !gh?.connected || deployOpenId == null) {
      setRepoList([]);
      return;
    }
    const q = repoQuery.trim();
    const id = window.setTimeout(() => {
      setReposBusy(true);
      getJson<GithubReposRes>(`/api/yeppie/github/repos?page=1&q=${encodeURIComponent(q)}`, {
        token: t,
      })
        .then((r) => setRepoList(r.repos ?? []))
        .catch(() => setRepoList([]))
        .finally(() => setReposBusy(false));
    }, 320);
    return () => window.clearTimeout(id);
  }, [repoQuery, gh?.connected, deployOpenId]);

  useEffect(() => {
    const t = getToken();
    if (!t || !gh?.connected) {
      setCreateRepoList([]);
      return;
    }
    const q = createRepoQuery.trim();
    const id = window.setTimeout(() => {
      setCreateReposBusy(true);
      getJson<GithubReposRes>(`/api/yeppie/github/repos?page=1&q=${encodeURIComponent(q)}`, {
        token: t,
      })
        .then((r) => setCreateRepoList(r.repos ?? []))
        .catch(() => setCreateRepoList([]))
        .finally(() => setCreateReposBusy(false));
    }, 320);
    return () => window.clearTimeout(id);
  }, [createRepoQuery, gh?.connected]);

  function applyCreateRepo(repo: GithubRepo) {
    setPendingGithubFullName(repo.full_name);
    setForm((f) => ({
      ...f,
      name: repo.name || repo.full_name.split("/")[1] || f.name,
      repoUrl: repo.html_url,
      branch: repo.default_branch || "main",
    }));
  }

  async function openDeploy(p: Project) {
    setDeployOpenId(p.id);
    const t = getToken();
    let proj = p;
    if (t) {
      try {
        const full = await getJson<OneRes>(`/api/yeppie/projects/${p.id}?secrets=1`, {
          token: t,
        });
        if (full.project) {
          proj = full.project;
          setProjects((prev) =>
            prev.map((x) => (x.id === full.project!.id ? full.project! : x))
          );
        }
      } catch {
        /* ignore */
      }
    }
    setLinkRepoInput(proj.githubRepoFullName ?? "");
    const tpl = gh?.deployHookUrlTemplate?.trim();
    const hookFromTemplate =
      tpl && !proj.deployHookUrl?.trim()
        ? tpl.replace(/\{projectId\}/g, String(proj.id))
        : "";
    setDeployForm({
      deploySubdomain:
        proj.deploySubdomain?.trim() ?? slugifySubdomain(proj.name),
      deployBaseDomain: proj.deployBaseDomain ?? "",
      deployHookUrl: proj.deployHookUrl?.trim() ?? hookFromTemplate,
      autoDeployEnabled: Boolean(proj.autoDeployEnabled),
    });
    setRepoQuery("");
  }

  function closeDeploy() {
    setDeployOpenId(null);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    const name = form.name.trim();
    if (!name) return;
    setCreateBusy(true);
    setLoadErr(null);
    try {
      const res = await postJson<OneRes>(
        "/api/yeppie/projects",
        {
          name,
          repo_url: form.repoUrl.trim() || undefined,
          branch: form.branch.trim() || "main",
          notes: form.notes.trim() || undefined,
        },
        { token: t }
      );
      if (!res.project) return;

      let finalProject = res.project;
      if (
        pendingGithubFullName &&
        autoLinkGithubOnCreate &&
        gh?.connected
      ) {
        try {
          const linked = await postJson<OneRes>(
            `/api/yeppie/projects/${res.project.id}/github/link`,
            {
              repoFullName: pendingGithubFullName,
              syncDefaultBranch: true,
            },
            { token: t }
          );
          if (linked.project) finalProject = linked.project;
        } catch (err: unknown) {
          setLoadErr(
            err instanceof Error
              ? `Проект создан, но GitHub: ${err.message}`
              : "Проект создан, но не удалось привязать репозиторий"
          );
        }
      }

      setProjects((prev) => [finalProject, ...prev]);
      setForm(emptyForm());
      setPendingGithubFullName(null);
      setCreateRepoQuery("");
    } catch (err: unknown) {
      setLoadErr(err instanceof Error ? err.message : "Ошибка создания");
    } finally {
      setCreateBusy(false);
    }
  }

  function startEdit(p: Project) {
    setEditingId(p.id);
    setEdit({
      name: p.name,
      repoUrl: p.repoUrl ?? "",
      branch: p.branch,
      notes: p.notes ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function onSaveEdit() {
    if (editingId == null) return;
    const t = getToken();
    if (!t) return;
    const name = edit.name.trim();
    if (!name) return;
    setSaveBusy(true);
    setLoadErr(null);
    try {
      const res = await patchJson<OneRes>(
        `/api/yeppie/projects/${editingId}`,
        {
          name,
          repo_url: edit.repoUrl.trim() || null,
          branch: edit.branch.trim() || "main",
          notes: edit.notes.trim() || null,
        },
        { token: t }
      );
      if (res.project) {
        setProjects((prev) =>
          prev.map((x) => (x.id === res.project.id ? res.project : x))
        );
        setEditingId(null);
      }
    } catch (err: unknown) {
      setLoadErr(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaveBusy(false);
    }
  }

  async function onDelete(p: Project) {
    if (!window.confirm(`Удалить проект «${p.name}»?`)) return;
    const t = getToken();
    if (!t) return;
    setLoadErr(null);
    try {
      await deleteJson<{ ok?: boolean }>(`/api/yeppie/projects/${p.id}`, {
        token: t,
      });
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
      if (editingId === p.id) setEditingId(null);
      if (deployOpenId === p.id) closeDeploy();
    } catch (err: unknown) {
      setLoadErr(err instanceof Error ? err.message : "Ошибка удаления");
    }
  }

  async function onLinkGithub(projectId: number) {
    const t = getToken();
    if (!t) return;
    const repoFullName = linkRepoInput.trim();
    if (!repoFullName) return;
    setLinkBusy(true);
    setLoadErr(null);
    try {
      const res = await postJson<OneRes>(
        `/api/yeppie/projects/${projectId}/github/link`,
        { repoFullName, syncDefaultBranch },
        { token: t }
      );
      if (res.project) {
        setProjects((prev) =>
          prev.map((x) => (x.id === res.project.id ? res.project : x))
        );
      }
    } catch (err: unknown) {
      setLoadErr(err instanceof Error ? err.message : "Ошибка привязки GitHub");
    } finally {
      setLinkBusy(false);
    }
  }

  async function onUnlinkGithub(projectId: number) {
    const t = getToken();
    if (!t) return;
    if (!window.confirm("Отвязать репозиторий и удалить webhook на GitHub?")) return;
    setLinkBusy(true);
    setLoadErr(null);
    try {
      const res = await deleteJson<OneRes>(`/api/yeppie/projects/${projectId}/github/link`, {
        token: t,
      });
      if (res.project) {
        setProjects((prev) =>
          prev.map((x) => (x.id === res.project.id ? res.project : x))
        );
      }
    } catch (err: unknown) {
      setLoadErr(err instanceof Error ? err.message : "Ошибка отвязки");
    } finally {
      setLinkBusy(false);
    }
  }

  async function onSaveDeploy(projectId: number) {
    const t = getToken();
    if (!t) return;
    setDeploySaveBusy(true);
    setLoadErr(null);
    try {
      const res = await patchJson<OneRes>(
        `/api/yeppie/projects/${projectId}`,
        {
          deploy_subdomain: deployForm.deploySubdomain.trim() || null,
          deploy_base_domain: deployForm.deployBaseDomain.trim() || null,
          deploy_hook_url: deployForm.deployHookUrl.trim() || null,
          auto_deploy_enabled: deployForm.autoDeployEnabled,
        },
        { token: t }
      );
      if (res.project) {
        setProjects((prev) =>
          prev.map((x) => (x.id === res.project.id ? res.project : x))
        );
      }
    } catch (err: unknown) {
      setLoadErr(err instanceof Error ? err.message : "Ошибка сохранения деплоя");
    } finally {
      setDeploySaveBusy(false);
    }
  }

  async function onTriggerDeploy(projectId: number) {
    const t = getToken();
    if (!t) return;
    setDeployTriggerBusy(true);
    setLoadErr(null);
    try {
      const res = await postJson<DeployTriggerRes>(
        `/api/yeppie/projects/${projectId}/deploy/trigger`,
        {},
        { token: t }
      );
      await load();
      if (!res.deploy?.ok) {
        setLoadErr(res.deploy?.error || res.deploy?.status || "Деплой завершился с ошибкой");
      }
    } catch (err: unknown) {
      setLoadErr(err instanceof Error ? err.message : "Ошибка деплоя");
    } finally {
      setDeployTriggerBusy(false);
    }
  }

  const cardClass =
    "rounded-2xl border border-[var(--color-yeppie-border)] bg-white/90 p-6 shadow-[0_1px_1px_rgba(0,0,0,0.04)]";

  const defaultDomain = gh?.deployDefaultDomain ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className={cardClass}>
        <h2 className="text-base font-medium text-[var(--color-yeppie-text)]">
          Новый проект
        </h2>
        <p className="mt-1 text-[15px] text-[var(--color-yeppie-muted)]">
          Можно выбрать репозиторий из GitHub ниже — поля заполнятся сами; после
          создания можно сразу создать webhook. Деплой на VPS — в карточке
          проекта.
        </p>

        {gh?.connected ? (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-surface)]/60 p-4">
            <p className="text-sm font-medium text-[var(--color-yeppie-text)]">
              Репозиторий из GitHub
            </p>
            <p className="mt-1 text-xs text-[var(--color-yeppie-muted)]">
              Поиск и клик по строке — подставит название, URL и ветку по
              умолчанию.
            </p>
            <input
              value={createRepoQuery}
              onChange={(e) => setCreateRepoQuery(e.target.value)}
              className="mt-3 w-full rounded-lg border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-3 py-2 text-sm"
              placeholder="Фильтр по имени…"
              list="create-github-repos"
            />
            <datalist id="create-github-repos">
              {createRepoList.map((r) => (
                <option key={r.full_name} value={r.full_name} />
              ))}
            </datalist>
            {createReposBusy ? (
              <p className="mt-2 text-xs text-[var(--color-yeppie-muted)]">
                Загрузка списка…
              </p>
            ) : null}
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
              {createRepoList.map((r) => (
                <li key={r.full_name}>
                  <button
                    type="button"
                    onClick={() => applyCreateRepo(r)}
                    className="w-full rounded-lg px-2 py-2 text-left text-sm text-[var(--color-yeppie-text)] hover:bg-white/80"
                  >
                    <span className="font-mono text-[13px]">{r.full_name}</span>
                    <span className="ml-2 text-xs text-[var(--color-yeppie-muted)]">
                      {r.default_branch}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {pendingGithubFullName ? (
              <div className="mt-3 space-y-2 border-t border-[var(--color-yeppie-border)] pt-3">
                <p className="text-xs text-[var(--color-yeppie-muted)]">
                  Выбрано для привязки:{" "}
                  <code className="text-[var(--color-yeppie-text)]">
                    {pendingGithubFullName}
                  </code>
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoLinkGithubOnCreate}
                    onChange={(e) =>
                      setAutoLinkGithubOnCreate(e.target.checked)
                    }
                  />
                  Создать webhook на GitHub после добавления проекта
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPendingGithubFullName(null);
                  }}
                  className="text-xs text-[var(--color-yeppie-muted)] underline"
                >
                  Сбросить выбор
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Подключите GitHub в разделе «Настройки», чтобы выбирать репозиторий из
            списка.
          </p>
        )}

        <form onSubmit={onCreate} className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-[var(--color-yeppie-text)]">
            Название
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-4 py-2.5 text-[15px] outline-none focus:border-[var(--color-yeppie-accent)] focus:ring-2 focus:ring-[rgba(196,92,58,0.25)]"
              placeholder="nhapp-api"
            />
          </label>
          <label className="block text-sm font-medium text-[var(--color-yeppie-text)]">
            URL репозитория (необязательно)
            <input
              type="url"
              value={form.repoUrl}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, repoUrl: v }));
                if (!v.trim()) setPendingGithubFullName(null);
              }}
              className="mt-1.5 w-full rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-4 py-2.5 text-[15px] outline-none focus:border-[var(--color-yeppie-accent)] focus:ring-2 focus:ring-[rgba(196,92,58,0.25)]"
              placeholder="https://github.com/you/repo"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--color-yeppie-text)]">
              Ветка
              <input
                value={form.branch}
                onChange={(e) =>
                  setForm((f) => ({ ...f, branch: e.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-4 py-2.5 text-[15px] outline-none focus:border-[var(--color-yeppie-accent)] focus:ring-2 focus:ring-[rgba(196,92,58,0.25)]"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-[var(--color-yeppie-text)]">
            Заметки
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              className="mt-1.5 w-full resize-y rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-4 py-2.5 text-[15px] outline-none focus:border-[var(--color-yeppie-accent)] focus:ring-2 focus:ring-[rgba(196,92,58,0.25)]"
              placeholder="PM2, порт…"
            />
          </label>
          <button
            type="submit"
            disabled={createBusy || !getToken()}
            className="rounded-xl bg-[var(--color-yeppie-accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-yeppie-accent-hover)] disabled:opacity-60"
          >
            {createBusy ? "Создание…" : "Добавить проект"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-base font-medium text-[var(--color-yeppie-text)]">
          Проекты
        </h2>
        {loadErr ? (
          <p className="text-sm text-red-600" role="alert">
            {loadErr}
          </p>
        ) : null}
        {loading ? (
          <p className="text-[15px] text-[var(--color-yeppie-muted)]">Загрузка…</p>
        ) : projects.length === 0 ? (
          <div className={cardClass}>
            <p className="text-[15px] text-[var(--color-yeppie-muted)]">
              Пока нет проектов. После добавления можно привязать GitHub и
              настроить webhook + деплой на VPS.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {projects.map((p) => (
              <li key={p.id} className={cardClass}>
                {editingId === p.id ? (
                  <div className="space-y-4">
                    <input
                      value={edit.name}
                      onChange={(e) =>
                        setEdit((x) => ({ ...x, name: e.target.value }))
                      }
                      className="w-full rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-4 py-2.5 text-[15px] font-medium outline-none focus:border-[var(--color-yeppie-accent)]"
                    />
                    <input
                      type="url"
                      value={edit.repoUrl}
                      onChange={(e) =>
                        setEdit((x) => ({ ...x, repoUrl: e.target.value }))
                      }
                      placeholder="https://…"
                      className="w-full rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-4 py-2.5 text-[15px] outline-none"
                    />
                    <input
                      value={edit.branch}
                      onChange={(e) =>
                        setEdit((x) => ({ ...x, branch: e.target.value }))
                      }
                      className="w-full max-w-xs rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-4 py-2.5 text-sm outline-none"
                    />
                    <textarea
                      rows={2}
                      value={edit.notes}
                      onChange={(e) =>
                        setEdit((x) => ({ ...x, notes: e.target.value }))
                      }
                      className="w-full rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-4 py-2.5 text-[15px] outline-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void onSaveEdit()}
                        disabled={saveBusy}
                        className="rounded-xl bg-[var(--color-yeppie-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-yeppie-accent-hover)] disabled:opacity-60"
                      >
                        {saveBusy ? "Сохранение…" : "Сохранить"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-surface)] px-4 py-2 text-sm"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-medium text-[var(--color-yeppie-text)]">
                          {p.name}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--color-yeppie-muted)]">
                          Обновлено{" "}
                          {new Date(p.updatedAt).toLocaleString("ru-RU", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <span className="rounded-lg bg-[var(--color-yeppie-surface)] px-2.5 py-1 font-mono text-xs text-[var(--color-yeppie-text)]">
                        {p.branch}
                      </span>
                    </div>
                    {p.repoUrl ? (
                      <a
                        href={p.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-[15px] text-[var(--color-yeppie-accent)] underline-offset-2 hover:underline"
                      >
                        {p.repoUrl}
                      </a>
                    ) : null}
                    {p.githubLinked ? (
                      <p className="mt-2 text-sm text-[var(--color-yeppie-muted)]">
                        GitHub:{" "}
                        <code className="text-[var(--color-yeppie-text)]">
                          {p.githubRepoFullName}
                        </code>
                      </p>
                    ) : null}
                    {p.deployFullHost ? (
                      <p className="mt-1 text-sm text-[var(--color-yeppie-muted)]">
                        Поддомен:{" "}
                        <span className="text-[var(--color-yeppie-text)]">
                          {p.deployFullHost}
                        </span>
                      </p>
                    ) : null}
                    {p.lastDeployAt ? (
                      <p className="mt-1 text-xs text-[var(--color-yeppie-muted)]">
                        Последний деплой:{" "}
                        {new Date(p.lastDeployAt).toLocaleString("ru-RU")}{" "}
                        {p.lastDeployStatus ? `— ${p.lastDeployStatus}` : ""}
                      </p>
                    ) : null}
                    {p.notes ? (
                      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--color-yeppie-muted)]">
                        {p.notes}
                      </p>
                    ) : null}

                    {deployOpenId === p.id ? (
                      <div className="mt-6 border-t border-[var(--color-yeppie-border)] pt-6">
                        <h4 className="text-sm font-medium text-[var(--color-yeppie-text)]">
                          GitHub и деплой на VPS
                        </h4>
                        {!gh?.connected ? (
                          <p className="mt-2 text-sm text-amber-800">
                            Подключите GitHub в разделе «Настройки», затем
                            привяжите репозиторий здесь.
                          </p>
                        ) : (
                          <>
                            <p className="mt-2 text-xs text-[var(--color-yeppie-muted)]">
                              Webhook на push создаётся на стороне GitHub
                              (события в ветку «{p.branch}»). При включённом
                              автодеплое API вызывает ваш URL на сервере.
                            </p>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                              <label className="block flex-1 text-sm">
                                Репозиторий (owner/repo)
                                <input
                                  value={linkRepoInput}
                                  onChange={(e) => setLinkRepoInput(e.target.value)}
                                  list={`repos-${p.id}`}
                                  className="mt-1 w-full rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-3 py-2 text-sm"
                                  placeholder="myorg/myapp"
                                />
                                <datalist id={`repos-${p.id}`}>
                                  {repoList.map((r) => (
                                    <option key={r.full_name} value={r.full_name} />
                                  ))}
                                </datalist>
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={syncDefaultBranch}
                                  onChange={(e) =>
                                    setSyncDefaultBranch(e.target.checked)
                                  }
                                />
                                Ветка из GitHub
                              </label>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <input
                                value={repoQuery}
                                onChange={(e) => setRepoQuery(e.target.value)}
                                className="min-w-[200px] flex-1 rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-3 py-2 text-xs"
                                placeholder="Поиск по списку репозиториев…"
                              />
                              {reposBusy ? (
                                <span className="text-xs text-[var(--color-yeppie-muted)]">
                                  загрузка…
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {p.githubLinked ? (
                                <button
                                  type="button"
                                  disabled={linkBusy}
                                  onClick={() => void onUnlinkGithub(p.id)}
                                  className="rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-surface)] px-4 py-2 text-sm"
                                >
                                  Отвязать GitHub
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={linkBusy}
                                  onClick={() => void onLinkGithub(p.id)}
                                  className="rounded-xl bg-[var(--color-yeppie-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-yeppie-accent-hover)] disabled:opacity-60"
                                >
                                  Привязать репозиторий
                                </button>
                              )}
                            </div>
                          </>
                        )}

                        <div className="mt-6 space-y-3">
                          <label className="block text-sm">
                            Поддомен (без точки)
                            <input
                              value={deployForm.deploySubdomain}
                              onChange={(e) =>
                                setDeployForm((f) => ({
                                  ...f,
                                  deploySubdomain: e.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-3 py-2 text-sm"
                              placeholder="app"
                            />
                          </label>
                          <label className="block text-sm">
                            Базовый домен (пусто = с API:{" "}
                            {defaultDomain || "не задан"})
                            <input
                              value={deployForm.deployBaseDomain}
                              onChange={(e) =>
                                setDeployForm((f) => ({
                                  ...f,
                                  deployBaseDomain: e.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-3 py-2 text-sm"
                              placeholder={defaultDomain || "example.com"}
                            />
                          </label>
                          <label className="block text-sm">
                            URL deploy-hook на VPS (только https)
                            <input
                              type="url"
                              value={deployForm.deployHookUrl}
                              onChange={(e) =>
                                setDeployForm((f) => ({
                                  ...f,
                                  deployHookUrl: e.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-bg)] px-3 py-2 text-sm"
                              placeholder="https://your-vps.example/hooks/yeppie"
                            />
                          </label>
                          {p.deployHookSecret ? (
                            <p className="text-xs text-[var(--color-yeppie-muted)]">
                              Секрет для проверки подписи на VPS (сохраните в
                              переменную окружения агента):{" "}
                              <code className="break-all text-[var(--color-yeppie-text)]">
                                {p.deployHookSecret}
                              </code>
                            </p>
                          ) : null}
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={deployForm.autoDeployEnabled}
                              onChange={(e) =>
                                setDeployForm((f) => ({
                                  ...f,
                                  autoDeployEnabled: e.target.checked,
                                }))
                              }
                            />
                            Автодеплой при push в ветку «{p.branch}»
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={deploySaveBusy}
                              onClick={() => void onSaveDeploy(p.id)}
                              className="rounded-xl bg-[var(--color-yeppie-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-yeppie-accent-hover)] disabled:opacity-60"
                            >
                              {deploySaveBusy ? "Сохранение…" : "Сохранить деплой"}
                            </button>
                            <button
                              type="button"
                              disabled={deployTriggerBusy}
                              onClick={() => void onTriggerDeploy(p.id)}
                              className="rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-surface)] px-4 py-2 text-sm"
                            >
                              {deployTriggerBusy ? "Запуск…" : "Запустить деплой"}
                            </button>
                            <button
                              type="button"
                              onClick={closeDeploy}
                              className="rounded-xl px-4 py-2 text-sm text-[var(--color-yeppie-muted)]"
                            >
                              Свернуть
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-surface)] px-4 py-2 text-sm text-[var(--color-yeppie-text)] transition hover:bg-white"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          deployOpenId === p.id
                            ? closeDeploy()
                            : void openDeploy(p)
                        }
                        className="rounded-xl border border-[var(--color-yeppie-border)] bg-[var(--color-yeppie-surface)] px-4 py-2 text-sm text-[var(--color-yeppie-text)] transition hover:bg-white"
                      >
                        {deployOpenId === p.id ? "Скрыть деплой" : "GitHub / деплой"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(p)}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 transition hover:bg-red-100"
                      >
                        Удалить
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
