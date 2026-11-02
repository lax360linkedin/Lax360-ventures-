import { useState } from 'react'
import { KeyRound, Pencil, Plus } from 'lucide-react'
import { api } from '../../services/apiClient.js'
import { useAdmin } from '../AdminApp.jsx'
import { Badge, Btn, Card, ConfirmDialog, DataTable, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Toggle, fmtDate, useFetch, useToast } from '../ui.jsx'

function PermissionBoxes({ modules, value, onChange, disabled }) {
  const grantable = Object.entries(modules).filter(([k]) => !['users', 'audit', 'system'].includes(k))
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-1 text-sm font-semibold">Modules this administrator may use</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {grantable.map(([k, name]) => (
          <label key={k} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-edge bg-glass px-3 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={value.includes(k)} onChange={(e) => onChange(e.target.checked ? [...value, k] : value.filter((x) => x !== k))} /> {name}
          </label>
        ))}
      </div>
      <p className="text-xs text-soft">Administrators, the audit log and system status are always super-admin only.</p>
    </fieldset>
  )
}

function Editor({ target, modules, onClose, onSaved }) {
  const toast = useToast()
  const [v, setV] = useState({ email: target?.email || '', full_name: target?.full_name || '', password: '', role: target?.role || 'admin', permissions: target?.permissions || ['enquiries'] })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true); setErrors({})
    try {
      if (target) await api(`/api/admin/users/${target.id}`, { method: 'PATCH', body: { full_name: v.full_name, role: v.role, permissions: v.permissions } })
      else await api('/api/admin/users', { method: 'POST', body: v })
      toast(target ? 'Administrator updated (they were signed out so the change applies now)' : 'Administrator created')
      onSaved(); onClose()
    } catch (e) { setErrors(e.fields || {}); toast(e.fields ? 'Please fix the highlighted fields.' : e.message, 'error') } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={target ? `Edit ${target.full_name}` : 'Add administrator'} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={save}>{target ? 'Save' : 'Create account'}</Btn></>}>
      <div className="space-y-3">
        <Field label="Full name" required error={errors.full_name}>{(p) => <Input {...p} value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />}</Field>
        <Field label="Email" required error={errors.email}>{(p) => <Input {...p} type="email" disabled={!!target} value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />}</Field>
        {!target && <Field label="Temporary password" required hint="At least 8 characters. Share it securely; they can change it after signing in." error={errors.password}>{(p) => <Input {...p} type="password" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />}</Field>}
        <Field label="Role" error={errors.role}>{(p) => <Select {...p} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}><option value="admin">Admin (limited to the modules below)</option><option value="super_admin">Super admin (everything)</option></Select>}</Field>
        <PermissionBoxes modules={modules} value={v.role === 'super_admin' ? Object.keys(modules) : v.permissions} disabled={v.role === 'super_admin'} onChange={(p) => setV({ ...v, permissions: p })} />
      </div>
    </Modal>
  )
}

function ResetPassword({ target, onClose }) {
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true); setErr('')
    try { await api(`/api/admin/users/${target.id}/reset-password`, { method: 'POST', body: { new_password: pw } }); toast('Password reset; they were signed out everywhere'); onClose() } catch (e) { setErr(e.fields?.new_password || e.message) } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={`Reset password for ${target.full_name}`} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" loading={busy} onClick={go}>Reset password</Btn></>}>
      <p className="mb-3 text-sm text-soft">No email is sent. Set a temporary password and give it to them securely.</p>
      <Field label="New password" required error={err} hint="At least 8 characters.">{(p) => <Input {...p} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />}</Field>
    </Modal>
  )
}

export default function Staff() {
  const toast = useToast()
  const { me } = useAdmin()
  const { data, error, loading, reload } = useFetch(() => api('/api/admin/users'), [])
  const [edit, setEdit] = useState(null)
  const [reset, setReset] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const setActive = async () => {
    setBusy(true)
    try { await api(`/api/admin/users/${confirm.id}`, { method: 'PATCH', body: { is_active: !confirm.is_active } }); toast(confirm.is_active ? 'Account deactivated and signed out' : 'Account reactivated'); reload() } catch (e) { toast(e.message, 'error') } finally { setBusy(false); setConfirm(null) }
  }
  const columns = [
    { key: 'name', header: 'Administrator', render: (u) => <span>{u.full_name}{u.id === me.user.id && <span className="ml-1 text-xs font-normal text-soft">(you)</span>}<span className="block text-xs font-normal text-soft">{u.email}</span></span> },
    { key: 'role', header: 'Role', render: (u) => <Badge value={u.role} /> },
    { key: 'perm', header: 'Modules', render: (u) => (u.role === 'super_admin' ? 'All' : u.permissions.length ? u.permissions.map((p) => me.modules[p] || p).join(', ') : <span className="text-soft">None</span>) },
    { key: 'status', header: 'Status', render: (u) => <Badge value={u.is_active ? 'active' : 'inactive'} /> },
    { key: 'created', header: 'Created', render: (u) => fmtDate(u.created_at) },
    { key: 'last', header: 'Last login', render: (u) => fmtDate(u.last_login_at) },
    { key: 'actions', header: <span className="sr-only">Actions</span>, render: (u) => (
      <span className="flex gap-1.5"><Btn aria-label={`Edit ${u.full_name}`} onClick={() => setEdit({ target: u })}><Pencil className="size-4" aria-hidden="true" /></Btn><Btn aria-label={`Reset password for ${u.full_name}`} onClick={() => setReset(u)}><KeyRound className="size-4" aria-hidden="true" /></Btn>
        <Btn kind={u.is_active ? 'danger' : 'secondary'} onClick={() => setConfirm(u)}>{u.is_active ? 'Deactivate' : 'Activate'}</Btn></span>) },
  ]
  return (
    <>
      <PageHeader title="Administrators" lead="Create staff accounts and choose which modules each can use. Changes sign the person out so they apply immediately. The last active super admin can never be removed."
        actions={<Btn kind="primary" onClick={() => setEdit({ target: null })}><Plus className="size-4" aria-hidden="true" /> Add administrator</Btn>} />
      <Card className="!p-0">
        {loading && !data && <div className="px-4"><Spinner /></div>}
        {error && !data && <div className="p-4"><ErrorState error={error} onRetry={reload} /></div>}
        {data && <DataTable columns={columns} rows={data} />}
      </Card>
      {edit && <Editor target={edit.target} modules={me.modules} onClose={() => setEdit(null)} onSaved={reload} />}
      {reset && <ResetPassword target={reset} onClose={() => setReset(null)} />}
      <ConfirmDialog open={!!confirm} busy={busy} confirmLabel={confirm?.is_active ? 'Deactivate' : 'Activate'} title={confirm?.is_active ? 'Deactivate this account?' : 'Reactivate this account?'} onClose={() => setConfirm(null)} onConfirm={setActive}>
        {confirm?.is_active ? `${confirm?.full_name} will be signed out immediately and cannot sign in until reactivated.` : `${confirm?.full_name} will be able to sign in again with their current permissions.`}
      </ConfirmDialog>
    </>
  )
}
