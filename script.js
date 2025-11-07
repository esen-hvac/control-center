// === MQTT CONFIG ===
const MQTT_BROKER = 'wss://39833c887da946b98b908a271cab3a25.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_USER = 'control';
const MQTT_PASS = 'Aice2025';

// === TODOS LOS TOPICS ===
const TOPICS = {
  supplyAirTemp: 'packageUnit5Ton_1/monitoring/supplyAirTemperature',
  returnTemp: 'packageUnit5Ton_1/monitoring/returnTemperature',
  returnHumidity: 'packageUnit5Ton_1/monitoring/returnHumidity',
  tempExt: 'packageUnit5Ton_1/monitoring/tempExt',
  humeExt: 'packageUnit5Ton_1/monitoring/humeExt',
  comp1Ap: 'packageUnit5Ton_1/monitoring/compresor1Ap',
  comp1Bp: 'packageUnit5Ton_1/monitoring/compresor1Bp',
  comp2Ap: 'packageUnit5Ton_1/monitoring/compresor2Ap',
  comp2Bp: 'packageUnit5Ton_1/monitoring/compresor2Bp',
  spTemp: 'packageUnit5Ton_1/monitoring/spTemp',

  comp1: 'packageUnit5Ton_1/monitoring/compresor1',
  comp2: 'packageUnit5Ton_1/monitoring/compresor2',
  vent1: 'packageUnit5Ton_1/monitoring/ventilador1',
  vent2: 'packageUnit5Ton_1/monitoring/ventilador2',
  motor1: 'packageUnit5Ton_1/monitoring/motorCondensador1',
  motor2: 'packageUnit5Ton_1/monitoring/motorCondensador2',

  onOff: 'packageUnit5Ton_1/control/onOff',
  reset: 'packageUnit5Ton_1/control/reset',
  spTempAjuste: 'packageUnit5Ton_1/control/spTempAjuste'
};

// === ELEMENTOS DOM ===
const els = {
  supplyAirTemp: document.getElementById('supplyAirTemp'),
  returnTemp: document.getElementById('returnTemp'),
  returnHumidity: document.getElementById('returnHumidity'),
  tempExt: document.getElementById('tempExt'),
  humeExt: document.getElementById('humeExt'),
  comp1Ap: document.getElementById('comp1Ap'),
  comp1Bp: document.getElementById('comp1Bp'),
  comp2Ap: document.getElementById('comp2Ap'),
  comp2Bp: document.getElementById('comp2Bp'),
  spTempValue: document.getElementById('spTempValue'),

  compr1Status: document.getElementById('compr1Status'),
  compr2Status: document.getElementById('compr2Status'),
  ventStatus: document.getElementById('ventStatus'),
  motor1Status: document.getElementById('motor1Status'),
  motor2Status: document.getElementById('motor2Status'),

  comp1: document.getElementById('comp1'),
  comp2: document.getElementById('comp2'),
  fan1: document.getElementById('fan1'),
  fan2: document.getElementById('fan2'),
  alarmIndicator: document.getElementById('alarmIndicator'),
  systemStatus: document.getElementById('systemStatus'),
  statusText: document.getElementById('statusText'),
  onOffBtn: document.getElementById('onOffBtn'),
  resetBtn: document.getElementById('resetBtn'),
  setpointSlider: document.getElementById('setpointSlider'),
  setpointValue: document.getElementById('setpointValue')
};

let client = null;
let systemOn = false;

// === INICIAR MQTT ===
function initMQTT() {
  const options = {
    username: MQTT_USER,
    password: MQTT_PASS,
    keepalive: 60,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    clean: true,
    clientId: 'web_' + Math.random().toString(16).substr(2, 8)
  };

  client = mqtt.connect(MQTT_BROKER, options);

  client.on('connect', () => {
    console.log('MQTT conectado');
    Object.values(TOPICS).forEach(t => client.subscribe(t, { qos: 1 }));
  });

  client.on('message', (topic, message) => {
    const value = message.toString().trim();
    console.log(`[${topic}] → ${value}`);

    // === ANALÓGICOS ===
    if (topic === TOPICS.supplyAirTemp) updateAnalog('supplyAirTemp', value, '°C');
    if (topic === TOPICS.returnTemp) updateAnalog('returnTemp', value, '°C');
    if (topic === TOPICS.returnHumidity) updateAnalog('returnHumidity', value, '%');
    if (topic === TOPICS.tempExt) updateAnalog('tempExt', value, '°C');
    if (topic === TOPICS.humeExt) updateAnalog('humeExt', value, '%');
    if (topic === TOPICS.comp1Ap) updateAnalog('comp1Ap', value, ' psi');
    if (topic === TOPICS.comp1Bp) updateAnalog('comp1Bp', value, ' psi');
    if (topic === TOPICS.comp2Ap) updateAnalog('comp2Ap', value, ' psi');
    if (topic === TOPICS.comp2Bp) updateAnalog('comp2Bp', value, ' psi');
    if (topic === TOPICS.spTemp) updateAnalog('spTempValue', value, '°C');

    // === BINARIOS ===
    if (topic === TOPICS.comp1) updateBinary('compr1Status', 'comp1', value === 'true');
    if (topic === TOPICS.comp2) updateBinary('compr2Status', 'comp2', value === 'true');

    if (topic === TOPICS.vent1 || topic === TOPICS.vent2) {
      const isOn = value === 'true';
      updateBinary('ventStatus', null, isOn);
      [els.fan1, els.fan2].forEach(fan => {
        fan.classList.toggle('on', isOn);
        fan.classList.toggle('off', !isOn);
      });
    }

    if (topic === TOPICS.motor1) updateBinary('motor1Status', null, value === 'true');
    if (topic === TOPICS.motor2) updateBinary('motor2Status', null, value === 'true');
  });
}

function updateAnalog(id, value, unit) {
  const el = document.getElementById(id);
  if (!el) return;
  const num = parseFloat(value);
  el.innerHTML = isNaN(num) ? `--<span class="unit">${unit}</span>` : `${num.toFixed(1)}<span class="unit">${unit}</span>`;
}

function updateBinary(statusId, diagramId, isOn) {
  const status = document.getElementById(statusId);
  const diagram = diagramId ? document.getElementById(diagramId) : null;

  if (status) {
    status.classList.toggle('on', isOn);
    status.classList.toggle('off', !isOn);
  }
  if (diagram) {
    diagram.classList.toggle('on', isOn);
    diagram.classList.toggle('off', !isOn);
  }
}

// === CONTROL: ON/OFF (cambia SIEMPRE tras confirmar) ===
els.onOffBtn.addEventListener('click', () => {
  const action = systemOn ? 'Apagar' : 'Encender';
  if (confirm(`¿${action} el sistema?`)) {
    systemOn = !systemOn;
    const payload = systemOn ? 'true' : 'false';
    client.publish(TOPICS.onOff, payload, { qos: 1 });

    // CAMBIA INMEDIATAMENTE
    els.onOffBtn.innerHTML = systemOn ? 'Apagar Sistema' : 'Encender Sistema';
    els.onOffBtn.style.background = systemOn ? '#ef4444' : '';
    els.systemStatus.classList.replace(systemOn ? 'off' : 'on', systemOn ? 'on' : 'off');
    els.statusText.innerHTML = systemOn ? 'Sistema Encendido' : 'Sistema Apagado';
    els.alarmIndicator.classList.toggle('on', systemOn);
  }
});

// === CONTROL: RESET (solo envía true) ===
els.resetBtn.addEventListener('click', () => {
  if (confirm('¿Resetear alarmas?')) {
    client.publish(TOPICS.reset, 'true', { qos: 1 });
    els.resetBtn.style.background = '#10b981';
    els.resetBtn.innerHTML = 'Reseteado';
    setTimeout(() => {
      els.resetBtn.style.background = '';
      els.resetBtn.innerHTML = 'Reset Alarmas';
    }, 1500);
  }
});

// === CONTROL: SETPOINT ===
els.setpointSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  els.setpointValue.innerHTML = value + '<span class="unit">°C</span>';
  client.publish(TOPICS.spTempAjuste, value, { qos: 1 });
});

// === INICIAR ===
document.addEventListener('DOMContentLoaded', initMQTT);