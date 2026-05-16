import { escapeHtml } from "./finance-sanitize.js";
import { state, refs } from "./finance-state.js";
import { api } from "./finance-api.js";
import { today, formatCurrency, formatDate } from "./finance-utils.js";

export function transactionCard(item) {
  const badgeClass = item.kind === "income" ? "income" : "expense";
  const sign = item.kind === "income" ? "+" : "-";
  const recurring = item.recurring ? '<span class="badge recurring">Recurrente</span>' : "";
  const paymentMethod = item.paymentMethod
    ? `<span class="muted">Pago: ${escapeHtml(item.paymentMethod)}</span>`
    : "";
  const notes = item.notes ? `<p class="notes">${escapeHtml(item.notes)}</p>` : "";
  const description = escapeHtml(item.description);
  const category = escapeHtml(item.category);

  return `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${description}</h3>
          <div class="card-meta">
            <span class="badge ${badgeClass}">${item.kind === "income" ? "Ingreso" : "Gasto"}</span>
            <span class="badge neutral">${category}</span>
            ${recurring}
          </div>
        </div>
        <div class="amount ${badgeClass}">${sign}${formatCurrency(item.amount)}</div>
      </div>
      <div class="meta-line">
        <span>${formatDate(item.date)}</span>
        ${paymentMethod}
      </div>
      ${notes}
      <div class="card-actions">
        <button
          type="button"
          class="secondary"
          data-action="edit-transaction"
          data-id="${item.id}"
          aria-label="Editar movimiento ${description} (${category})"
        >Editar</button>
        <button
          type="button"
          class="danger"
          data-action="delete-transaction"
          data-id="${item.id}"
          aria-label="Eliminar movimiento ${description} (${category})"
        >Eliminar</button>
      </div>
    </article>
  `;
}

export function renderTransactions() {
  refs.transactionsMeta.textContent = `${state.transactions.length} movimientos encontrados para ${state.month}`;
  if (!state.transactions.length) {
    refs.transactionsList.innerHTML =
      '<div class="empty">No hay movimientos en este mes todavía.</div>';
    return;
  }
  refs.transactionsList.innerHTML = state.transactions.map(transactionCard).join("");
}

export function resetTransactionForm() {
  refs.transactionForm.reset();
  refs.txKind.value = "expense";
  refs.txAmount.value = "";
  refs.txRecurring.checked = false;
  refs.txDate.value = today();
}

export function setTransactionFormMode(isEditing) {
  refs.transactionFormTitle.textContent =
    isEditing && state.transactionEditingId
      ? `Editar movimiento #${state.transactionEditingId}`
      : "Nuevo movimiento";
  refs.transactionSubmitBtn.textContent = isEditing ? "Guardar cambios" : "Guardar movimiento";
  refs.transactionCancelEditBtn.classList.toggle("hidden", !isEditing);
}

export function cancelTransactionEdit() {
  state.transactionEditingId = null;
  setTransactionFormMode(false);
  resetTransactionForm();
}

export function startTransactionEdit(item) {
  state.transactionEditingId = item.id;
  refs.txKind.value = item.kind || "expense";
  refs.txAmount.value = String(item.amount || "");
  refs.txCategory.value = item.category || "";
  refs.txDate.value = item.date || today();
  refs.txDescription.value = item.description || "";
  refs.txPaymentMethod.value = item.paymentMethod || "";
  refs.txRecurring.checked = Boolean(item.recurring);
  refs.txNotes.value = item.notes || "";
  setTransactionFormMode(true);
  refs.transactionForm.scrollIntoView({ behavior: "smooth", block: "center" });
  refs.txDescription.focus();
}

export async function loadTransactions() {
  const data = await api(`/api/transactions?month=${encodeURIComponent(state.month)}`);
  state.transactions = data.transactions;
  renderTransactions();
}

export async function createTransaction() {
  const payload = {
    kind: refs.txKind.value,
    amount: refs.txAmount.value,
    category: refs.txCategory.value.trim(),
    date: refs.txDate.value,
    description: refs.txDescription.value.trim(),
    paymentMethod: refs.txPaymentMethod.value.trim(),
    recurring: refs.txRecurring.checked,
    notes: refs.txNotes.value.trim(),
  };

  await api("/api/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  resetTransactionForm();
}

export async function updateTransaction(id) {
  const payload = {
    kind: refs.txKind.value,
    amount: refs.txAmount.value,
    category: refs.txCategory.value.trim(),
    date: refs.txDate.value,
    description: refs.txDescription.value.trim(),
    paymentMethod: refs.txPaymentMethod.value.trim(),
    recurring: refs.txRecurring.checked,
    notes: refs.txNotes.value.trim(),
  };

  await api(`/api/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  cancelTransactionEdit();
}
