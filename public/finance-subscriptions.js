import { escapeHtml } from "./finance-sanitize.js";
import { state, refs } from "./finance-state.js";
import { api } from "./finance-api.js";
import { today, formatCurrency, formatDate, cycleLabel, monthlyEquivalent } from "./finance-utils.js";

export function subscriptionCard(item) {
  const active = item.status === "active";
  const statusClass = active ? "income" : "neutral";
  const paymentMethod = item.paymentMethod
    ? `<span class="muted">Pago: ${escapeHtml(item.paymentMethod)}</span>`
    : "";
  const notes = item.notes ? `<p class="notes">${escapeHtml(item.notes)}</p>` : "";
  const name = escapeHtml(item.name);
  const category = escapeHtml(item.category);

  return `
    <article class="card ${active ? "" : "muted-card"}">
      <div class="card-top">
        <div>
          <h3>${name}</h3>
          <div class="card-meta">
            <span class="badge ${statusClass}">${active ? "Activa" : "Pausada"}</span>
            <span class="badge neutral">${category}</span>
            <span class="badge recurring">${cycleLabel(item.billingCycle)}</span>
          </div>
        </div>
        <div class="amount expense">${formatCurrency(item.amount)}</div>
      </div>
      <div class="meta-line">
        <span>Próximo cobro: ${formatDate(item.nextChargeDate)}</span>
        <span>Promedio mensual: ${formatCurrency(monthlyEquivalent(item))}</span>
        ${paymentMethod}
      </div>
      ${notes}
      <div class="card-actions">
        <button
          type="button"
          class="secondary"
          data-action="toggle-subscription"
          data-id="${item.id}"
          aria-label="${active ? "Pausar" : "Reactivar"} suscripción ${name} (${category})"
        >${active ? "Pausar" : "Reactivar"}</button>
        <button
          type="button"
          class="secondary"
          data-action="edit-subscription"
          data-id="${item.id}"
          aria-label="Editar suscripción ${name} (${category})"
        >Editar</button>
        <button
          type="button"
          class="danger"
          data-action="delete-subscription"
          data-id="${item.id}"
          aria-label="Eliminar suscripción ${name} (${category})"
        >Eliminar</button>
      </div>
    </article>
  `;
}

export function renderSubscriptions() {
  refs.subscriptionsMeta.textContent = `${state.subscriptions.length} suscripciones registradas`;
  if (!state.subscriptions.length) {
    refs.subscriptionsList.innerHTML =
      '<div class="empty">Todavía no has añadido suscripciones.</div>';
    return;
  }
  refs.subscriptionsList.innerHTML = state.subscriptions.map(subscriptionCard).join("");
}

export function resetSubscriptionForm() {
  refs.subscriptionForm.reset();
  refs.subCycle.value = "monthly";
  refs.subNextChargeDate.value = today();
}

export function setSubscriptionFormMode(isEditing) {
  refs.subscriptionFormTitle.textContent = isEditing ? "Editar suscripción" : "Nueva suscripción";
  refs.subscriptionSubmitBtn.textContent = isEditing ? "Guardar cambios" : "Guardar suscripción";
  refs.subscriptionCancelEditBtn.classList.toggle("hidden", !isEditing);
}

export function cancelSubscriptionEdit() {
  state.subscriptionEditingId = null;
  setSubscriptionFormMode(false);
  resetSubscriptionForm();
}

export function startSubscriptionEdit(item) {
  state.subscriptionEditingId = item.id;
  refs.subName.value = item.name || "";
  refs.subAmount.value = String(item.amount || "");
  refs.subCategory.value = item.category || "";
  refs.subCycle.value = item.billingCycle || "monthly";
  refs.subNextChargeDate.value = item.nextChargeDate || today();
  refs.subPaymentMethod.value = item.paymentMethod || "";
  refs.subNotes.value = item.notes || "";
  setSubscriptionFormMode(true);
  refs.subscriptionForm.scrollIntoView({ behavior: "smooth", block: "center" });
  refs.subName.focus();
}

export async function loadSubscriptions() {
  const data = await api("/api/subscriptions");
  state.subscriptions = data.subscriptions;
  renderSubscriptions();
}

export async function createSubscription() {
  const payload = {
    name: refs.subName.value.trim(),
    amount: refs.subAmount.value,
    category: refs.subCategory.value.trim(),
    billingCycle: refs.subCycle.value,
    nextChargeDate: refs.subNextChargeDate.value,
    paymentMethod: refs.subPaymentMethod.value.trim(),
    notes: refs.subNotes.value.trim(),
  };

  await api("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  resetSubscriptionForm();
}

export async function updateSubscription(id) {
  const payload = {
    name: refs.subName.value.trim(),
    amount: refs.subAmount.value,
    category: refs.subCategory.value.trim(),
    billingCycle: refs.subCycle.value,
    nextChargeDate: refs.subNextChargeDate.value,
    paymentMethod: refs.subPaymentMethod.value.trim(),
    notes: refs.subNotes.value.trim(),
  };

  await api(`/api/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  cancelSubscriptionEdit();
}
