import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const STEP = { LOGIN: 'login', SCAN_MACHINE: 'scan_machine', SCAN_FG: 'scan_fg', SCAN_MATERIAL: 'scan_material', RESULT: 'result' };

export default function ScannerPage() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(user ? STEP.SCAN_MACHINE : STEP.LOGIN);
  const [loginForm, setLoginForm] = useState({ username:'', password:'' });
  const [loginError, setLoginError] = useState('');
  const [machineCode, setMachineCode] = useState('');
  const [machineInput, setMachineInput] = useState('');
  const [machineInfo, setMachineInfo] = useState(null);
  const [fgInput, setFgInput] = useState('');
  const [fgValidated, setFgValidated] = useState(null);
  const [materialInput, setMaterialInput] = useState('');
  const [result, setResult] = useState(null);
  const [scanLog, setScanLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alarm, setAlarm] = useState(false);
  const machineRef = useRef();
  const fgRef = useRef();
  const materialRef = useRef();

  // Auto-focus inputs
  useEffect(() => { if (step === STEP.SCAN_MACHINE && machineRef.current) machineRef.current.focus(); }, [step]);
  useEffect(() => { if (step === STEP.SCAN_FG && fgRef.current) fgRef.current.focus(); }, [step]);
  useEffect(() => { if (step === STEP.SCAN_MATERIAL && materialRef.current) materialRef.current.focus(); }, [step]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await login(loginForm.username, loginForm.password);
      setStep(STEP.SCAN_MACHINE);
    } catch (err) { setLoginError(err.message); }
  };

  const handleMachineScan = async (e) => {
    e.preventDefault();
    if (!machineInput.trim()) return;
    setLoading(true);
    try {
      const info = await api.getMachineInfo(machineInput.trim());
      setMachineInfo(info);
      setMachineCode(machineInput.trim());
      setMachineInput('');
      
      if (info.plan?.finished_goods_id) {
        setStep(STEP.SCAN_FG);
      } else {
        setStep(STEP.SCAN_MATERIAL);
      }
    } catch (err) {
      alert(`Machine not found: ${machineInput}. Please check the barcode.`);
    } finally { setLoading(false); }
  };

  const handleFgScan = async (e) => {
    e.preventDefault();
    if (!fgInput.trim()) return;
    setLoading(true);
    try {
      const res = await api.validateScan(machineCode, fgInput.trim(), null);
      if (res.is_valid) {
        setFgValidated(fgInput.trim());
        setStep(STEP.SCAN_MATERIAL);
        setFgInput('');
      } else {
        setAlarm(true);
        setResult(res);
        setFgInput('');
      }
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleMaterialScan = async (e) => {
    e.preventDefault();
    if (!materialInput.trim()) return;
    setLoading(true);
    setAlarm(false);
    try {
      const res = await api.validateScan(machineCode, fgValidated, materialInput.trim());
      setResult(res);
      setScanLog(prev => [{ ...res, material: materialInput.trim(), ts: new Date() }, ...prev].slice(0, 20));
      setMaterialInput('');
      if (!res.is_valid) {
        setAlarm(true);
        // Play alarm sound
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'square'; osc.frequency.value = 880;
          gain.gain.value = 0.3; osc.start(); osc.stop(ctx.currentTime + 0.5);
        } catch {}
      }
      // Auto-refocus
      setTimeout(() => { if (materialRef.current) materialRef.current.focus(); }, 200);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const clearAlarm = () => { 
    setAlarm(false); 
    setResult(null); 
    if (step === STEP.SCAN_FG) {
      setTimeout(() => fgRef.current?.focus(), 100);
    } else {
      setTimeout(() => materialRef.current?.focus(), 100); 
    }
  };
  const resetMachine = () => { 
    setStep(STEP.SCAN_MACHINE); 
    setMachineInfo(null); 
    setResult(null); 
    setAlarm(false); 
    setScanLog([]); 
    setFgValidated(null);
  };

  // ——— Views ———

  if (step === STEP.LOGIN || !user) return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div className="login-card" style={{ maxWidth:'360px' }}>
        <div className="login-logo">📱</div>
        <h1 className="login-title" style={{ fontSize:'1.25rem' }}>Scanner Login</h1>
        <p className="login-subtitle">Production Validation</p>
        {loginError && <div className="alert alert-error" style={{ marginBottom:'16px' }}>⚠️ {loginError}</div>}
        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <input className="form-input" placeholder="Username" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username:e.target.value})} required autoFocus />
          <input className="form-input" type="password" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password:e.target.value})} required />
          <button type="submit" className="btn btn-primary btn-lg w-full" style={{ justifyContent:'center' }}>Sign In</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)', padding:'16px', maxWidth:'480px', margin:'0 auto', fontFamily:'Inter, sans-serif' }}>
      {/* Alarm overlay */}
      {alarm && (
        <div className="alarm-overlay" onClick={clearAlarm}>
          <div style={{ background:'rgba(0,0,0,0.8)', borderRadius:'20px', padding:'32px', textAlign:'center', maxWidth:'320px' }}>
            <div style={{ fontSize:'64px' }}>🚨</div>
            <h2 style={{ color:'#ef4444', fontSize:'1.5rem', marginBottom:'10px' }}>{step === STEP.SCAN_FG ? 'WRONG FG POUCH!' : 'WRONG PACKING MATERIAL!'}</h2>
            <p style={{ color:'#f1f5f9', marginBottom:'8px' }}>{result?.error}</p>
            <p style={{ color:'#94a3b8', fontSize:'0.8rem', marginBottom:'20px' }}>Remove the incorrect item and clear this alarm before proceeding.</p>
            <button className="btn btn-danger btn-lg" onClick={clearAlarm} style={{ width:'100%', justifyContent:'center' }}>
              ✓ Clear Alarm & Continue
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
        <div>
          <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Production Validation</div>
          <div style={{ fontWeight:'700', fontSize:'1rem' }}>👤 {user.full_name}</div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/dashboard')}>🖥 Desktop</button>
          <button className="btn btn-sm btn-danger" onClick={() => { logout(); setStep(STEP.LOGIN); }}>Logout</button>
        </div>
      </div>

      {/* Step 1: Scan Machine */}
      {step === STEP.SCAN_MACHINE && (
        <div className="card" style={{ textAlign:'center' }}>
          <div style={{ fontSize:'48px', marginBottom:'12px' }}>⚙️</div>
          <h2 style={{ marginBottom:'6px' }}>Step 1: Scan Machine</h2>
          <p className="text-muted" style={{ marginBottom:'20px', fontSize:'0.875rem' }}>Scan the packing machine barcode</p>
          <form onSubmit={handleMachineScan} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <input
              ref={machineRef}
              className="form-input"
              value={machineInput}
              onChange={e => setMachineInput(e.target.value)}
              placeholder="Scan machine code..."
              style={{ fontSize:'1.1rem', textAlign:'center', letterSpacing:'0.05em' }}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ justifyContent:'center' }}>
              {loading ? '⟳ Checking...' : '→ Next Step'}
            </button>
          </form>
        </div>
      )}

      {(step === STEP.SCAN_FG || step === STEP.SCAN_MATERIAL) && (
        <>
          {/* Machine info card */}
          <div className="card card-sm" style={{ marginBottom:'12px', background:'var(--accent-light)', borderColor:'var(--border-accent)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start' }}>
              <div>
                <div style={{ fontSize:'0.7rem', color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'4px' }}>Active Machine</div>
                <div style={{ fontWeight:'700', fontSize:'1rem' }}>⚙️ {machineInfo?.machine?.name}</div>
                <code style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{machineCode}</code>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={resetMachine}>Change</button>
            </div>
            {machineInfo?.plan ? (
              <div style={{ marginTop:'10px', paddingTop:'10px', borderTop:'1px solid var(--border-accent)' }}>
                <div style={{ fontSize:'0.7rem', color:'var(--accent)', marginBottom:'2px' }}>ACTIVE PLAN</div>
                {machineInfo.plan.finished_goods_id ? (
                  <>
                    <div style={{ fontWeight:'600' }}>🏷️ FG: {machineInfo.plan.finished_good_name}</div>
                    <code style={{ fontSize:'0.75rem', color:'var(--success)' }}>{machineInfo.plan.finished_good_part_number}</code>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight:'600' }}>📦 PM: {machineInfo.plan.packing_material_name}</div>
                    <code style={{ fontSize:'0.75rem', color:'var(--success)' }}>{machineInfo.plan.packing_material_part_number}</code>
                  </>
                )}
                <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:'4px' }}>
                  Batch: {machineInfo.plan.batch_number || '—'}
                </div>
              </div>
            ) : (
              <div className="alert alert-warning" style={{ marginTop:'10px', padding:'8px 10px' }}>⚠️ No active production plan for this machine</div>
            )}
          </div>

          {/* Step 2: Scan FG */}
          {step === STEP.SCAN_FG && (
            <div className="card" style={{ textAlign:'center' }}>
              <div style={{ fontSize:'40px', marginBottom:'8px' }}>🏷️</div>
              <h2 style={{ marginBottom:'4px', fontSize:'1.1rem' }}>Step 2: Scan FG Pouch</h2>
              <p className="text-muted" style={{ marginBottom:'16px', fontSize:'0.8rem' }}>Scan the Finished Good pouch barcode before loading</p>
              <form onSubmit={handleFgScan} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <input
                  ref={fgRef}
                  className="form-input"
                  value={fgInput}
                  onChange={e => setFgInput(e.target.value)}
                  placeholder="Scan FG pouch barcode..."
                  style={{ fontSize:'1.1rem', textAlign:'center', letterSpacing:'0.05em' }}
                  autoComplete="off"
                />
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !fgInput} style={{ justifyContent:'center' }}>
                  {loading ? '⟳ Validating...' : '→ Next Step'}
                </button>
              </form>
            </div>
          )}

          {/* Step 3: Scan PM */}
          {step === STEP.SCAN_MATERIAL && (
            <div className="card" style={{ textAlign:'center' }}>
              {fgValidated && (
                <div className="badge badge-green" style={{ marginBottom: '10px' }}>✓ FG Validated: {fgValidated}</div>
              )}
              <div style={{ fontSize:'40px', marginBottom:'8px' }}>📦</div>
              <h2 style={{ marginBottom:'4px', fontSize:'1.1rem' }}>{machineInfo?.plan?.finished_goods_id ? 'Step 3: Scan Packing Material' : 'Step 2: Scan Packing Material'}</h2>
              <p className="text-muted" style={{ marginBottom:'16px', fontSize:'0.8rem' }}>Scan each packet/roll before loading</p>
              <form onSubmit={handleMaterialScan} style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <input
                  ref={materialRef}
                  className="form-input"
                  value={materialInput}
                  onChange={e => setMaterialInput(e.target.value)}
                  placeholder="Scan packing material barcode..."
                  style={{ fontSize:'1.1rem', textAlign:'center', letterSpacing:'0.05em' }}
                  autoComplete="off"
                />
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !materialInput} style={{ justifyContent:'center' }}>
                  {loading ? '⟳ Validating...' : '✓ Validate'}
                </button>
              </form>

              {/* Last result */}
              {result && !alarm && (
                <div className={`alert ${result.is_valid ? 'alert-success' : 'alert-error'}`} style={{ marginTop:'16px', textAlign:'left' }}>
                  <span>{result.is_valid ? '✅' : '❌'}</span>
                  <div>
                    <strong>{result.is_valid ? 'MATCH — OK to load' : 'MISMATCH — DO NOT LOAD'}</strong>
                    {!result.is_valid && <div style={{ fontSize:'0.8rem' }}>{result.error}</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scan log */}
          {scanLog.length > 0 && (
            <div className="card card-sm" style={{ marginTop:'12px' }}>
              <h4 style={{ marginBottom:'10px' }}>Scan Log</h4>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', maxHeight:'200px', overflowY:'auto' }}>
                {scanLog.map((log, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', background:'var(--bg-input)', borderRadius:'6px', fontSize:'0.75rem' }}>
                    <span style={{ color: log.is_valid ? 'var(--success)' : 'var(--danger)' }}>{log.is_valid ? '✅' : '❌'} {log.material}</span>
                    <span style={{ color:'var(--text-muted)' }}>{log.ts.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
