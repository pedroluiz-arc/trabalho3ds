document.addEventListener('DOMContentLoaded', () => {
    // Inicializa a lista de solicitações no localStorage se não existir
    if (!localStorage.getItem('solicitacoes')) {
        localStorage.setItem('solicitacoes', JSON.stringify([]));
    }

    // Roteamento de formulários de login
    setupLoginRedirect('loginFormProfessor', 'dashboard_professor.html');
    setupLoginRedirect('loginFormCoordenador', 'lista_pedidos_coordenador.html');

    // Lógica para cada página
    if (document.querySelector('body.dashboard-professor')) {
        // Nada específico para o dashboard principal por enquanto
    } else if (document.querySelector('body.ficha-saida')) {
        setupFichaSaidaPage();
    } else if (document.querySelector('body.aulas-hoje')) {
        // Lógica para aulas de hoje, se necessário
    } else if (document.querySelector('body.coordenador-lista')) {
        setupCoordenadorPage();
    }
});

function setupLoginRedirect(formId, targetUrl) {
    const loginForm = document.getElementById(formId);
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Aqui você pode adicionar a lógica de autenticação real
            // Por enquanto, apenas redireciona
            window.location.href = targetUrl;
        });
    }
}

// =================================================================
// LÓGICA DA PÁGINA DO PROFESSOR (FICHA DE SAÍDA E HISTÓRICO)
// =================================================================
function setupFichaSaidaPage() {
    const form = document.getElementById('fichaSaidaForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const novaSolicitacao = {
            id: 'sol-' + Date.now(),
            aluno: e.target.nomeAluno.value,
            turma: e.target.turma.value,
            professor: e.target.nomeProfessor.value,
            horaSaida: e.target.horarioSaida.value,
            validoAte: e.target.validoAte.value,
            motivo: e.target.motivo.value,
            status: 'liberado', // 'liberado', 'retornando', 'atrasado', 'retornou'
            returnStartTime: null,
        };

        const solicitacoes = JSON.parse(localStorage.getItem('solicitacoes'));
        solicitacoes.push(novaSolicitacao);
        localStorage.setItem('solicitacoes', JSON.stringify(solicitacoes));
        
        form.reset();
        alert('Solicitação de saída enviada para o coordenador.');
        renderHistoricoProfessor();
    });

    renderHistoricoProfessor();
    setInterval(renderHistoricoProfessor, 5000); // Atualiza a cada 5 segundos
}

function renderHistoricoProfessor() {
    const container = document.getElementById('Historico').querySelector('.list-container');
    if (!container) return;

    const solicitacoes = JSON.parse(localStorage.getItem('solicitacoes'));
    container.innerHTML = ''; // Limpa a lista antes de renderizar

    solicitacoes.forEach(sol => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'list-item';
        itemDiv.id = sol.id;

        let content = `
            <div class="item-info">
                <span class="item-name">${sol.aluno}</span>
                <span class="item-time">Saiu às: ${sol.horaSaida}</span>
            </div>
        `;

        if (sol.status === 'retornando' || sol.status === 'atrasado') {
            const tempoRestante = 5 * 60 * 1000 - (Date.now() - sol.returnStartTime);
            const minutos = Math.floor(tempoRestante / 60000);
            const segundos = Math.floor((tempoRestante % 60000) / 1000);

            if (tempoRestante > 0) {
                 content += `
                    <div class="status-retornando">
                        <span>Retornando (${minutos}:${segundos.toString().padStart(2, '0')})</span>
                        <button class="button-confirmar-retorno">ALUNO RETORNOU</button>
                    </div>`;
            } else {
                // Se o tempo acabou, o status é atualizado para 'atrasado'
                if (sol.status !== 'atrasado') {
                    updateSolicitacaoStatus(sol.id, 'atrasado');
                }
                 content += `
                    <div class="status-retornando">
                        <span>ATRASADO!</span>
                        <button class="button-confirmar-retorno">ALUNO RETORNOU</button>
                    </div>`;
            }
           
        } else if (sol.status === 'liberado') {
            content += `<span class="status-liberado">LIBERADO</span>`;
        } else {
             content += `<span class="status-retornou">RETORNOU</span>`;
        }

        itemDiv.innerHTML = content;
        container.appendChild(itemDiv);
    });

    // Adiciona event listeners aos novos botões
    document.querySelectorAll('.button-confirmar-retorno').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.closest('.list-item').id;
            updateSolicitacaoStatus(id, 'retornou');
            alert('Retorno do aluno confirmado!');
        });
    });
}


// =================================================================
// LÓGICA DA PÁGINA DO COORDENADOR
// =================================================================
function setupCoordenadorPage() {
    renderListaCoordenador();
    setInterval(() => {
        renderListaCoordenador();
        checkAtrasosCoordenador();
        checkValidoAteExpires();
    }, 5000); // Atualiza a cada 5 segundos
}

function renderListaCoordenador() {
    const container = document.querySelector('.coordenador-lista .list-container');
    if (!container) return;

    const solicitacoes = JSON.parse(localStorage.getItem('solicitacoes'));
    container.innerHTML = '';

    const alunosFora = solicitacoes.filter(s => s.status === 'liberado');

    alunosFora.forEach(sol => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'request-item';
        itemDiv.id = sol.id;
        itemDiv.innerHTML = `
            <div class="item-details">
                <span class="item-name">${sol.aluno} (${sol.turma})</span>
                <span class="item-time-out">Saiu às: ${sol.horaSaida}</span>
            </div>
            <button class="button-retorno">RETORNANDO</button>
        `;
        container.appendChild(itemDiv);
    });

    document.querySelectorAll('.button-retorno').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.closest('.request-item').id;
            alert('Notificação enviada ao professor. O aluno tem 5 minutos para retornar.');
            const solicitacoes = JSON.parse(localStorage.getItem('solicitacoes'));
            const index = solicitacoes.findIndex(s => s.id === id);
            if (index > -1) {
                solicitacoes[index].status = 'retornando';
                solicitacoes[index].returnStartTime = Date.now();
                localStorage.setItem('solicitacoes', JSON.stringify(solicitacoes));
                renderListaCoordenador();
            }
        });
    });
}

function checkAtrasosCoordenador() {
    const solicitacoes = JSON.parse(localStorage.getItem('solicitacoes'));
    solicitacoes.forEach(sol => {
        if (sol.status === 'retornando') {
            const tempoDesdeRetorno = Date.now() - sol.returnStartTime;
            if (tempoDesdeRetorno > 5 * 60 * 1000) {
                 updateSolicitacaoStatus(sol.id, 'atrasado');
                 // Evita múltiplos alertas
                 if (!sessionStorage.getItem('alerted-' + sol.id)) {
                    alert(`ALERTA: O professor não confirmou o retorno de ${sol.aluno} em 5 minutos!`);
                    sessionStorage.setItem('alerted-' + sol.id, 'true');
                 }
            }
        }
    });
}

function checkValidoAteExpires() {
    const solicitacoes = JSON.parse(localStorage.getItem('solicitacoes'));
    const now = new Date();

    solicitacoes.forEach(sol => {
        // Apenas checa alunos que estão liberados e tem um tempo de validade
        if (sol.status === 'liberado' && sol.validoAte) {
            const [hours, minutes] = sol.validoAte.split(':');
            const validoAteDate = new Date();
            validoAteDate.setHours(hours, minutes, 0, 0);

            // Se o tempo expirou e ainda não alertamos
            if (now > validoAteDate && !sessionStorage.getItem('expired-alert-' + sol.id)) {
                alert(`ALERTA: O tempo de saída para ${sol.aluno} (autorizado até ${sol.validoAte}) expirou!`);
                // Marca no sessionStorage para não alertar novamente
                sessionStorage.setItem('expired-alert-' + sol.id, 'true');
            }
        }
    });
}


// =================================================================
// FUNÇÕES UTILITÁRIAS
// =================================================================
function updateSolicitacaoStatus(id, newStatus) {
    const solicitacoes = JSON.parse(localStorage.getItem('solicitacoes'));
    const index = solicitacoes.findIndex(s => s.id === id);
    if (index > -1) {
        solicitacoes[index].status = newStatus;
        localStorage.setItem('solicitacoes', JSON.stringify(solicitacoes));
    }
}

// Adiciona classes aos bodys para facilitar o roteamento de JS
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split("/").pop();
    if (path === 'dashboard_professor.html') {
        document.body.classList.add('dashboard-professor');
    } else if (path === 'ficha_saida.html') {
        document.body.classList.add('ficha-saida');
    } else if (path === 'aulas_hoje.html') {
        document.body.classList.add('aulas-hoje');
    } else if (path === 'lista_pedidos_coordenador.html') {
        document.body.classList.add('coordenador-lista');
    }
});

window.addEventListener('storage', (event) => {
    if (event.key === 'solicitacoes') {
        if (document.body.classList.contains('coordenador-lista')) {
            renderListaCoordenador();
        }
        if (document.body.classList.contains('ficha-saida')) {
            renderHistoricoProfessor();
        }
    }
});
