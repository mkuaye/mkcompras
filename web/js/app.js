let ultimoLink = '';

function getElement(id) {
  return document.getElementById(id);
}

async function converter() {
  const input = getElement('link-input');
  const btn = getElement('btn-convert');
  const box = getElement('result-box');
  const url = input.value.trim();

  if (!url) {
    mostrarErro('Cole um link antes de converter.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Convertendo...';
  box.className = 'result-box';

  try {
    const res = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      mostrarErro(data.error || 'Nao foi possivel converter este link.');
    } else {
      mostrarSucesso(data.affiliateUrl);
    }
  } catch {
    mostrarErro('Erro de conexao. Tente novamente.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Converter';
  }
}

function mostrarSucesso(link) {
  ultimoLink = link;
  const box = getElement('result-box');
  const label = getElement('result-label');
  const linkDiv = getElement('result-link');
  const linkRow = getElement('result-link-row');
  const errMsg = getElement('error-msg');
  const copyBtn = getElement('btn-copy');

  box.className = 'result-box success';
  label.textContent = 'Link de afiliado gerado';
  linkDiv.textContent = link;
  linkRow.style.display = 'flex';
  errMsg.textContent = '';
  copyBtn.textContent = 'Copiar';
  copyBtn.className = 'btn-copy';
}

function mostrarErro(msg) {
  const box = getElement('result-box');
  const label = getElement('result-label');
  const linkRow = getElement('result-link-row');
  const errMsg = getElement('error-msg');

  box.className = 'result-box error';
  label.textContent = 'Nao foi possivel converter';
  linkRow.style.display = 'none';
  errMsg.textContent = msg;
}

async function copiar() {
  if (!ultimoLink) {
    return;
  }

  try {
    await navigator.clipboard.writeText(ultimoLink);
    const btn = getElement('btn-copy');
    btn.textContent = 'Copiado!';
    btn.className = 'btn-copy copied';

    setTimeout(() => {
      btn.textContent = 'Copiar';
      btn.className = 'btn-copy';
    }, 2000);
  } catch {
    alert(`Copie manualmente: ${ultimoLink}`);
  }
}

function initListeners() {
  getElement('btn-convert').addEventListener('click', converter);
  getElement('btn-copy').addEventListener('click', copiar);
  getElement('link-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      converter();
    }
  });
}

document.addEventListener('DOMContentLoaded', initListeners);
