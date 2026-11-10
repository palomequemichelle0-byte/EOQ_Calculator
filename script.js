
// ==========================================
// CALCULADORA EOQ - CUATRO MODELOS
// ==========================================

const modelos = {
    basico: {
        titulo: "EOQ Básico",
        descripcion: "Cantidad económica de pedido sin faltantes."
    },
    faltantes: {
        titulo: "EOQ con faltantes",
        descripcion: "Cantidad económica permitiendo pedidos pendientes."
    },
    produccion: {
        titulo: "EOQ de producción",
        descripcion: "Lote económico cuando el inventario se produce gradualmente."
    },
    deficit: {
        titulo: "Producción con déficit",
        descripcion: "Modelo de producción que permite faltantes."
    }
};

let ultimoCalculo = null;

function seleccionarModelo(modelo) {
    const configuracion = modelos[modelo];
    if (!configuracion) return;

    let seccion = document.getElementById("calculadora");

    if (!seccion) {
        seccion = document.createElement("section");
        seccion.id = "calculadora";
        seccion.className = "calculadora";
        document.getElementById("modelos").after(seccion);
    }

    const campos = [
        { id: "demanda", nombre: "Demanda (D)", unidad: "Unidades por periodo" },
        { id: "pedido", nombre: "Costo de pedido o preparación (S)", unidad: "Moneda por pedido" },
        { id: "mantenimiento", nombre: "Costo de mantenimiento (H)", unidad: "Moneda por unidad por periodo" }
    ];

    if (modelo === "faltantes" || modelo === "deficit") {
        campos.push({
            id: "faltante",
            nombre: "Costo de faltante (P)",
            unidad: "Moneda por unidad por periodo"
        });
    }

    if (modelo === "produccion" || modelo === "deficit") {
        campos.push({
            id: "produccion",
            nombre: "Tasa de producción (p)",
            unidad: "Unidades por periodo"
        });
    }

    seccion.innerHTML = `
        <div class="titulo-seccion">
            <span class="etiqueta">CALCULADORA EOQ</span>
            <h2>${configuracion.titulo}</h2>
            <p>${configuracion.descripcion}</p>
        </div>

        <form id="formularioEOQ">
            <div class="formulario-grid">
                ${campos.map(c => `
                    <div class="campo">
                        <label for="${c.id}">${c.nombre}</label>
                        <input
                            type="number"
                            id="${c.id}"
                            min="0"
                            step="any"
                            placeholder="Escribe un valor"
                            required
                        >
                        <small>${c.unidad}</small>
                    </div>
                `).join("")}
            </div>

            <button type="submit" class="boton-calcular">
                Calcular modelo
            </button>
        </form>

        <div id="resultados" class="resultados">
            <p>Ingresa los datos para comenzar tu cálculo.</p>
        </div>
    `;

    seccion.scrollIntoView({ behavior: "smooth" });

    document.getElementById("formularioEOQ").addEventListener("submit", event => {
        event.preventDefault();
        calcularEOQ(modelo);
    });
}

function calcularEOQ(modelo) {
    const obtener = id => Number(document.getElementById(id).value);

    const D = obtener("demanda");
    const S = obtener("pedido");
    const H = obtener("mantenimiento");

    if (![D, S, H].every(Number.isFinite) || D <= 0 || S <= 0 || H <= 0) {
        alert("La demanda, el costo de pedido y el mantenimiento deben ser mayores que cero.");
        return;
    }

    let P = 0;
    let p = 0;
    let factor = 1;
    let operacion;
    let formula;

    if (modelo === "faltantes" || modelo === "deficit") {
        P = obtener("faltante");

        if (!Number.isFinite(P) || P <= 0) {
            alert("El costo de faltante debe ser mayor que cero.");
            return;
        }
    }

    if (modelo === "produccion" || modelo === "deficit") {
        p = obtener("produccion");

        if (!Number.isFinite(p) || p <= D) {
            alert("La tasa de producción debe ser mayor que la demanda.");
            return;
        }

        factor = 1 - D / p;
    }

    // Fórmulas de cantidad óptima
    switch (modelo) {
        case "basico":
            operacion = (2 * D * S) / H;
            formula = "Q* = √(2DS / H)";
            break;

        case "faltantes":
            operacion = (2 * D * S * (H + P)) / (H * P);
            formula = "Q* = √[2DS(H + P) / (HP)]";
            break;

        case "produccion":
            operacion = (2 * D * S) / (H * factor);
            formula = "Q* = √[2DS / (H(1 - D/p))]";
            break;

        case "deficit":
            operacion = (2 * D * S * (H + P)) / (H * P * factor);
            formula = "Q* = √[2DS(H + P) / (HP(1 - D/p))]";
            break;

        default:
            return;
    }

    const Q = Math.sqrt(operacion);

    // Costos de ordenar o preparar
    const costoPedidos = (D / Q) * S;

    // Costos de inventario y faltantes
    let inventarioMaximo;
    let faltanteMaximo = 0;
    let costoMantenimiento;
    let costoFaltantes = 0;

    if (modelo === "basico") {
        inventarioMaximo = Q;
        costoMantenimiento = H * Q / 2;
    } else if (modelo === "faltantes") {
        inventarioMaximo = Q * P / (H + P);
        faltanteMaximo = Q * H / (H + P);

        costoMantenimiento =
            H * inventarioMaximo ** 2 / (2 * Q);

        costoFaltantes =
            P * faltanteMaximo ** 2 / (2 * Q);
    } else if (modelo === "produccion") {
        inventarioMaximo = Q * factor;
        costoMantenimiento = H * inventarioMaximo / 2;
    } else {
        const amplitud = Q * factor;

        inventarioMaximo = amplitud * P / (H + P);
        faltanteMaximo = amplitud * H / (H + P);

        costoMantenimiento =
            H * inventarioMaximo ** 2 / (2 * amplitud);

        costoFaltantes =
            P * faltanteMaximo ** 2 / (2 * amplitud);
    }

    const costoTotal = costoPedidos + costoMantenimiento + costoFaltantes;

    ultimoCalculo = {
        modelo, D, S, H, P, p, Q, factor,
        inventarioMaximo, faltanteMaximo,
        costoPedidos, costoMantenimiento,
        costoFaltantes, costoTotal, formula, operacion
    };

    mostrarResultados(ultimoCalculo);
}

function moneda(valor) {
    return "$" + valor.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function mostrarResultados(r) {
    const resultados = document.getElementById("resultados");

    resultados.innerHTML = `
        <h2>Resultados del cálculo</h2>

        <div class="resultado-principal">
            <span>CANTIDAD ÓPTIMA DE PEDIDO</span>
            <strong>${r.Q.toFixed(2)}</strong>
            <small>Unidades</small>
        </div>

        <h3>Resumen de costos</h3>

        <div class="tarjetas-costos">
            <div class="tarjeta-costo">
                <span>Costo de pedido</span>
                <strong>${moneda(r.costoPedidos)}</strong>
            </div>
            <div class="tarjeta-costo">
                <span>Mantenimiento</span>
                <strong>${moneda(r.costoMantenimiento)}</strong>
            </div>
            <div class="tarjeta-costo">
                <span>Faltantes</span>
                <strong>${moneda(r.costoFaltantes)}</strong>
            </div>
            <div class="tarjeta-costo costo-total">
                <span>Costo total relevante</span>
                <strong>${moneda(r.costoTotal)}</strong>
            </div>
        </div>

        <h3>Procedimiento matemático</h3>
        <div class="procedimiento">
            <p><strong>Fórmula:</strong> ${r.formula}</p>
            <p><strong>Sustitución:</strong> Q* = √(${r.operacion.toFixed(4)})</p>
            <p><strong>Resultado:</strong> Q* = ${r.Q.toFixed(2)} unidades</p>
            <p><strong>Inventario máximo:</strong> ${r.inventarioMaximo.toFixed(2)} unidades</p>
            ${r.faltanteMaximo > 0
                ? `<p><strong>Faltante máximo:</strong> ${r.faltanteMaximo.toFixed(2)} unidades</p>`
                : ""}
        </div>

        <h3>Visualización de resultados</h3>
        <div class="graficas">
            <div class="grafica">
                <h4>Distribución de costos</h4>
                <canvas id="graficaCostos"></canvas>
            </div>
            <div class="grafica">
                <h4>Composición del costo total</h4>
                <canvas id="graficaComparacion"></canvas>
            </div>
        </div>

        <h3>Comportamiento del inventario</h3>
        <div class="grafica grafica-amplia">
            <canvas id="graficaInventario"></canvas>
        </div>

        <h3>Costos según la cantidad solicitada</h3>
        <div class="grafica grafica-amplia">
            <canvas id="graficaCostosDetalle"></canvas>
        </div>

        <h3>Interpretación</h3>
        <div class="interpretacion">
            Para el modelo ${modelos[r.modelo].titulo}, la cantidad óptima calculada es
            de <strong>${r.Q.toFixed(2)} unidades</strong>.
            El costo total relevante estimado por periodo es de
            <strong>${moneda(r.costoTotal)}</strong>.
            ${r.faltanteMaximo > 0
                ? `El modelo contempla un faltante máximo de ${r.faltanteMaximo.toFixed(2)} unidades.`
                : "Este resultado se obtiene bajo los supuestos del modelo seleccionado."}
        </div>

        <button type="button" class="boton-imprimir" onclick="window.print()">
            Imprimir resultados
        </button>
    `;

    dibujarGraficas(r);
}

// ==========================================
// FUNCIONES DE GRÁFICAS
// ==========================================

function prepararCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;

    const ancho = Math.max(canvas.clientWidth, 280);
    const alto = 280;
    const escala = window.devicePixelRatio || 1;

    canvas.width = ancho * escala;
    canvas.height = alto * escala;
    canvas.style.height = alto + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(escala, 0, 0, escala, 0, 0);

    return { ctx, ancho, alto };
}

function dibujarGraficas(r) {
    dibujarBarras(r);
    dibujarInventario(r);
    dibujarCurvaCostos(r);
}

function dibujarBarras(r) {
    const datos = [
        r.costoPedidos,
        r.costoMantenimiento,
        r.costoFaltantes
    ];

    const etiquetas = ["Pedido", "Mantenimiento", "Faltantes"];
    const colores = ["#2563eb", "#60a5fa", "#239b75"];

    ["graficaCostos", "graficaComparacion"].forEach(id => {
        const grafica = prepararCanvas(id);
        if (!grafica) return;

        const { ctx, ancho } = grafica;
        const maximo = Math.max(...datos, 1);
        const espacio = ancho / 3;

        ctx.clearRect(0, 0, ancho, 280);
        ctx.font = "12px Arial";
        ctx.textAlign = "center";

        datos.forEach((valor, i) => {
            const altura = valor / maximo * 170;
            const x = espacio * i + espacio * 0.2;
            const y = 210 - altura;
            const anchoBarra = espacio * 0.6;

            ctx.fillStyle = colores[i];
            ctx.fillRect(x, y, anchoBarra, altura);

            ctx.fillStyle = "#172554";
            ctx.fillText(moneda(valor), x + anchoBarra / 2, Math.max(y - 9, 14));

            ctx.fillStyle = "#475569";
            ctx.fillText(etiquetas[i], x + anchoBarra / 2, 235);
        });
    });
}

function dibujarInventario(r) {
    const grafica = prepararCanvas("graficaInventario");
    if (!grafica) return;

    const { ctx, ancho, alto } = grafica;
    const izquierda = 48;
    const derecha = ancho - 20;
    const arriba = 35;
    const abajo = alto - 40;

    const tieneFaltantes = r.modelo === "faltantes" || r.modelo === "deficit";
    const esProduccion = r.modelo === "produccion" || r.modelo === "deficit";

    const maximo = Math.max(r.inventarioMaximo, 1);
    const minimo = tieneFaltantes ? -Math.max(r.faltanteMaximo, 1) : 0;
    const rango = maximo - minimo;

    const x = t => izquierda + t * (derecha - izquierda);
    const y = valor => abajo - ((valor - minimo) / rango) * (abajo - arriba);

    ctx.clearRect(0, 0, ancho, alto);

    ctx.strokeStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(izquierda, arriba);
    ctx.lineTo(izquierda, abajo);
    ctx.lineTo(derecha, abajo);
    ctx.stroke();

    if (tieneFaltantes) {
        ctx.strokeStyle = "#dc8b32";
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(izquierda, y(0));
        ctx.lineTo(derecha, y(0));
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.beginPath();

    if (r.modelo === "basico") {
        for (let i = 0; i <= 8; i++) {
            const px = x(i / 8);
            const py = y(i % 2 === 0 ? r.Q : 0);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
    } else if (r.modelo === "faltantes") {
        const valores = [
            [0, r.inventarioMaximo],
            [0.5, -r.faltanteMaximo],
            [0.5, r.inventarioMaximo],
            [1, -r.faltanteMaximo]
        ];
        valores.forEach(([t, v], i) => {
            if (i === 0) ctx.moveTo(x(t), y(v));
            else ctx.lineTo(x(t), y(v));
        });
    } else if (esProduccion && !tieneFaltantes) {
        const valores = [
            [0, 0], [0.25, r.inventarioMaximo],
            [0.75, 0], [1, 0]
        ];
        valores.forEach(([t, v], i) => {
            if (i === 0) ctx.moveTo(x(t), y(v));
            else ctx.lineTo(x(t), y(v));
        });
    } else {
        const valores = [
            [0, -r.faltanteMaximo],
            [0.35, r.inventarioMaximo],
            [0.65, r.inventarioMaximo],
            [1, -r.faltanteMaximo]
        ];
        valores.forEach(([t, v], i) => {
            if (i === 0) ctx.moveTo(x(t), y(v));
            else ctx.lineTo(x(t), y(v));
        });
    }

    ctx.stroke();

    ctx.fillStyle = "#172554";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Nivel máximo: " + r.inventarioMaximo.toFixed(2), izquierda, 17);
    ctx.fillText("Tiempo", derecha - 35, alto - 8);
}

function dibujarCurvaCostos(r) {
    const grafica = prepararCanvas("graficaCostosDetalle");
    if (!grafica) return;

    const { ctx, ancho, alto } = grafica;
    const izquierda = 48;
    const derecha = ancho - 20;
    const arriba = 25;
    const abajo = alto - 42;

    const minQ = r.Q * 0.3;
    const maxQ = r.Q * 2.2;
    const puntos = [];

    for (let i = 0; i <= 60; i++) {
        const Q = minQ + (maxQ - minQ) * i / 60;
        const pedidos = r.D * r.S / Q;

        let variable;

        if (r.modelo === "basico") {
            variable = r.H * Q / 2;
        } else if (r.modelo === "faltantes") {
            variable = r.H * r.P * Q / (2 * (r.H + r.P));
        } else if (r.modelo === "produccion") {
            variable = r.H * Q * r.factor / 2;
        } else {
            variable = r.H * r.P * Q * r.factor / (2 * (r.H + r.P));
        }

        puntos.push({ Q, pedidos, variable, total: pedidos + variable });
    }

    const maxCosto = Math.max(...puntos.map(p => p.total)) * 1.1;

    ctx.clearRect(0, 0, ancho, alto);
    ctx.strokeStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(izquierda, arriba);
    ctx.lineTo(izquierda, abajo);
    ctx.lineTo(derecha, abajo);
    ctx.stroke();

    const px = q => izquierda + (q - minQ) / (maxQ - minQ) * (derecha - izquierda);
    const py = costo => abajo - costo / maxCosto * (abajo - arriba);

    function linea(propiedad, color) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;

        puntos.forEach((p, i) => {
            if (i === 0) ctx.moveTo(px(p.Q), py(p[propiedad]));
            else ctx.lineTo(px(p.Q), py(p[propiedad]));
        });

        ctx.stroke();
    }

    linea("pedidos", "#2563eb");
    linea("variable", "#e69a36");
    linea("total", "#239b75");

    ctx.strokeStyle = "#64748b";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(px(r.Q), arriba);
    ctx.lineTo(px(r.Q), abajo);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = "11px Arial";
    ctx.fillStyle = "#2563eb";
    ctx.fillText("● Pedido", izquierda, alto - 22);
    ctx.fillStyle = "#e69a36";
    ctx.fillText("● Inventario/faltantes", izquierda + 80, alto - 22);
    ctx.fillStyle = "#239b75";
    ctx.fillText("● Total", izquierda + 225, alto - 22);
    ctx.fillStyle = "#172554";
    ctx.fillText("Q* = " + r.Q.toFixed(2), px(r.Q) - 30, arriba + 12);
}

// Redibuja las gráficas cuando cambia el tamaño de la pantalla.
window.addEventListener("resize", () => {
    if (ultimoCalculo && document.getElementById("graficaInventario")) {
        dibujarGraficas(ultimoCalculo);
    }
});
