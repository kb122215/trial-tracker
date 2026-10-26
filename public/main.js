const messageEl = document.querySelector("#message");

function showMessage(text) {
  messageEl.textContent = text;
}

function setStatus(id, status) {
  fetch(`/trials/${id}`, {
    method: "put",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    })
    .then(() => window.location.reload())
    .catch(() => showMessage("Could not update that trial. Try again."));
}

function deleteTrial(id) {
  if (!confirm("Delete this trial?")) return;

  fetch(`/trials/${id}`, { method: "delete" })
    .then((res) => {
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    })
    .then(() => window.location.reload())
    .catch(() => showMessage("Could not delete that trial. Try again."));
}

// One listener on the list handles every button (event delegation)
document.querySelector(".trials")?.addEventListener("click", (event) => {
  const item = event.target.closest(".trial");
  if (!item) return;
  const id = item.dataset.id;

  if (event.target.matches(".mark-canceled")) setStatus(id, "canceled");
  if (event.target.matches(".mark-active")) setStatus(id, "active");
  if (event.target.matches(".delete")) deleteTrial(id);
});
