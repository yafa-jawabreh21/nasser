(function(){
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const show = (tab) => { $$('.card').forEach(s=>s.classList.add('hidden')); $('#tab-'+tab).classList.remove('hidden'); };
  $$('.nav a').forEach(a=>a.onclick = (e)=>{ e.preventDefault(); show(a.dataset.tab); });

  let token = localStorage.getItem('harmah_token') || null;
  const api = (path, opts={}) => {
    const headers = Object.assign({'Content-Type':'application/json'}, opts.headers||{});
    if(token) headers['Authorization'] = 'Bearer '+token;
    return fetch(window.HARMAH_CONFIG.API_BASE + path, Object.assign({}, opts, {headers}));
  };

  // Helper functions for data display
  const formatTable = (data, title = null) => {
    if (!data || data.length === 0) return '<div class="no-data">لا توجد بيانات</div>';
    
    let html = title ? `<h3>${title}</h3>` : '';
    html += '<table class="data-table"><thead><tr>';
    
    // Create table headers from object keys
    Object.keys(data[0]).forEach(key => {
      html += `<th>${key}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // Create table rows
    data.forEach(item => {
      html += '<tr>';
      Object.values(item).forEach(value => {
        html += `<td>${typeof value === 'object' ? JSON.stringify(value) : value}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    return html;
  };

  const formatCards = (data, titleKey, contentKeys) => {
    if (!data || data.length === 0) return '<div class="no-data">لا توجد بيانات</div>';
    
    let html = '<div class="card-grid">';
    data.forEach(item => {
      html += '<div class="data-card">';
      if (titleKey && item[titleKey]) {
        html += `<h3>${item[titleKey]}</h3>`;
      }
      
      contentKeys.forEach(key => {
        if (item[key] !== undefined) {
          html += `<div class="card-field"><span class="field-label">${key}:</span> ${item[key]}</div>`;
        }
      });
      
      html += '</div>';
    });
    html += '</div>';
    return html;
  };

  const formatKeyValue = (data) => {
    if (!data) return '<div class="no-data">لا توجد بيانات</div>';
    
    let html = '<div class="key-value-grid">';
    Object.entries(data).forEach(([key, value]) => {
      html += `<div class="key-value-item"><span class="key">${key}:</span> <span class="value">${typeof value === 'object' ? JSON.stringify(value) : value}</span></div>`;
    });
    html += '</div>';
    return html;
  };

  // Login
  $('#btn-login').onclick = async () => {
    const email = $('#email').value.trim();
    const password = $('#password').value;
    const res = await api('/api/auth/login', {method:'POST', body: JSON.stringify({email,password})});
    if(!res.ok){ $('#login-status').textContent = 'فشل الدخول'; return; }
    const data = await res.json();
    token = data.access_token;
    localStorage.setItem('harmah_token', token);
    $('#login-status').textContent = 'تم — جاهز';
  };

  // Projects
  $('#btn-load-projects').onclick = async () => {
    const res = await api('/api/core/projects');
    const data = await res.json();
    $('#projects-out').innerHTML = formatTable(data, 'المشاريع');
  };

    // PMO Portfolio - Fixed
  $('#btn-pmo-portfolio').onclick = async () => {
    const res = await api('/api/pmo/portfolio');
    const data = await res.json();
    $('#pmo-portfolio').innerHTML = `
      <div class="key-value-grid">
        <div class="key-value-item"><span class="key">عدد المشاريع:</span> <span class="value">${data.count_projects || 0}</span></div>
        <div class="key-value-item"><span class="key">عدد المهام:</span> <span class="value">${data.count_tasks || 0}</span></div>
        <div class="key-value-item"><span class="key">عدد المخاطر:</span> <span class="value">${data.count_risks || 0}</span></div>
        <div class="key-value-item"><span class="key">عدد القضايا:</span> <span class="value">${data.count_issues || 0}</span></div>
      </div>
    `;
  };
  
  // PMO KPIs - Fixed
  $('#btn-pmo-kpis').onclick = async () => {
    const res = await api('/api/pmo/kpis');
    const data = await res.json();
    let html = '<div class="kpi-grid">';
    
    data.forEach(kpi => {
      const percentage = Math.round((kpi.value / kpi.target) * 100);
      html += `
        <div class="kpi-card">
          <h3>${kpi.name}</h3>
          <div class="kpi-value">${kpi.value}</div>
          <div class="kpi-target">الهدف: ${kpi.target}</div>
          <div class="kpi-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${percentage > 100 ? 100 : percentage}%"></div>
            </div>
            <span class="progress-text">${percentage}%</span>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    $('#pmo-kpis').innerHTML = html;
  };
  
  // PMO Risks - Fixed
  $('#btn-pmo-risks').onclick = async () => {
    const res = await api('/api/pmo/risk_register?limit=50');
    const data = await res.json();
    
    if (!data || data.length === 0) {
      $('#pmo-risks').innerHTML = '<div class="no-data">لا توجد مخاطر مسجلة</div>';
      return;
    }
    
    let html = '<table class="data-table"><thead><tr>';
    html += '<th>التصنيف</th><th>الوصف</th><th>الاحتمالية</th><th>التأثير</th><th>الحالة</th>';
    html += '</tr></thead><tbody>';
    
    data.forEach(risk => {
      html += '<tr>';
      html += `<td>${risk.category || 'غير محدد'}</td>`;
      html += `<td>${risk.description || 'لا يوجد وصف'}</td>`;
      html += `<td>${risk.probability || 'غير محدد'}</td>`;
      html += `<td>${risk.impact || 'غير محدد'}</td>`;
      html += `<td>${risk.status || 'غير محدد'}</td>`;
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    $('#pmo-risks').innerHTML = html;
  };
  
  // Vision - Fixed
  $('#btn-vision').onclick = async () => {
    const res = await api('/api/vision/overview');
    const data = await res.json();
    
    let html = `
      <div class="vision-header">
        <div class="vision-overall">متوسط الأداء الفعلي: <strong>${data.overall_actual_avg}%</strong></div>
        <div class="vision-date">تم التحديث: ${new Date(data.generated_at).toLocaleString('ar-SA')}</div>
      </div>
      <div class="sectors-grid">
    `;
    
    data.sectors.forEach(sector => {
      const statusClass = sector.status === 'Ahead' ? 'ahead' : (sector.status === 'Behind' ? 'behind' : 'on-track');
      
      html += `
        <div class="sector-card ${statusClass}">
          <h3>${sector.name}</h3>
          <div class="sector-progress">
            <div class="progress-comparison">
              <div class="progress-item">
                <span class="progress-label">المخطط</span>
                <span class="progress-value">${sector.plan}%</span>
              </div>
              <div class="progress-item">
                <span class="progress-label">الفعلية</span>
                <span class="progress-value ${sector.gap >= 0 ? 'positive' : 'negative'}">${sector.actual}%</span>
              </div>
            </div>
            <div class="gap-indicator">
              الفارق: <span class="${sector.gap >= 0 ? 'positive' : 'negative'}">${sector.gap >= 0 ? '+' : ''}${sector.gap}%</span>
            </div>
          </div>
          <div class="sector-status">الحالة: <span class="status-badge ${statusClass}">${sector.status === 'Ahead' ? 'متقدم' : (sector.status === 'Behind' ? 'متأخر' : 'ضمن المسار')}</span></div>
          <div class="sector-recommendation">التوصية: ${sector.recommendation}</div>
        </div>
      `;
    });
    
    html += '</div>';
    $('#vision-out').innerHTML = html;
  };

    // EVM sample - Fixed for the specific response format
  $('#btn-evm-run').onclick = async () => {
    const boq = `ItemCode,Description,Unit,Qty,UnitPrice
C-001,Concrete C30,m3,1200,300
S-010,Rebar,ton,150,2200
F-020,Formwork,m2,5000,45
`;
    const prog = `ItemCode,Period,QtyDone,AC
C-001,2025-07,300,70000
C-001,2025-08,550,120000
S-010,2025-07,40,60000
S-010,2025-08,75,90000
F-020,2025-07,1000,20000
F-020,2025-08,1800,35000
`;
    
    try {
      $('#evm-out').innerHTML = '<div class="loading">جاري معالجة بيانات EVM...</div>';
      
      const res = await api('/api/evm/run', {
        method: 'POST', 
        body: JSON.stringify({boq_csv:boq, progress_csv:prog})
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Display the EVM metrics in a user-friendly format
      displayEVMMetrics(data);
      
    } catch (error) {
      $('#evm-out').innerHTML = `
        <div class="error">خطأ في الاتصال: ${error.message}</div>
      `;
      console.error('EVM Error:', error);
    }
    
    function displayEVMMetrics(metrics) {
      if (!metrics) {
        $('#evm-out').innerHTML = '<div class="no-data">لا توجد بيانات EVM</div>';
        return;
      }
      
      const metricLabels = {
        'BAC': 'الموازنة عند الإكمال',
        'PV': 'القيمة المخططة',
        'EV': 'القيمة المكتسبة', 
        'AC': 'التكلفة الفعلية',
        'CV': 'انحراف التكلفة (EV - AC)',
        'SV': 'انحراف الجدول (EV - PV)',
        'CPI': 'مؤشر أداء التكلفة (EV/AC)',
        'SPI': 'مؤشر أداء الجدول (EV/PV)',
        'EAC': 'التقدير عند الإكمال (BAC/CPI)',
        'ETC': 'التقدير للإكمال (EAC - AC)',
        'VAC': 'انحراف عند الإكمال (BAC - EAC)',
        'TCPI': 'مؤشر أداء التكلفة المستهدف',
        'latest_period': 'آخر فترة'
      };
      
      // Calculate derived metrics
      const cv = metrics.EV - metrics.AC;
      const sv = metrics.EV - metrics.PV;
      const vac = metrics.BAC - metrics.EAC;
      
      let html = `
        <div class="evm-header">
          <h3>تحليل القيمة المكتسبة (EVM)</h3>
          <div class="evm-period">آخر فترة: ${metrics.latest_period || 'غير محدد'}</div>
        </div>
        
        <div class="evm-metrics-grid">
          <div class="evm-metric-card primary">
            <div class="metric-label">${metricLabels['BAC']}</div>
            <div class="metric-value">${formatCurrency(metrics.BAC)}</div>
            <div class="metric-description">إجمالي الميزانية المخطط لها</div>
          </div>
          
          <div class="evm-metric-card ${metrics.EV >= metrics.PV ? 'positive' : 'negative'}">
            <div class="metric-label">${metricLabels['EV']}</div>
            <div class="metric-value">${formatCurrency(metrics.EV)}</div>
            <div class="metric-description">قيمة العمل المنجز</div>
          </div>
          
          <div class="evm-metric-card ${metrics.AC <= metrics.EV ? 'positive' : 'negative'}">
            <div class="metric-label">${metricLabels['AC']}</div>
            <div class="metric-value">${formatCurrency(metrics.AC)}</div>
            <div class="metric-description">التكلفة الفعلية المنفقة</div>
          </div>
          
          <div class="evm-metric-card">
            <div class="metric-label">${metricLabels['PV']}</div>
            <div class="metric-value">${formatCurrency(metrics.PV)}</div>
            <div class="metric-description">قيمة العمل المخطط له</div>
          </div>
        </div>
        
        <div class="evm-performance-grid">
          <div class="evm-performance-card">
            <h4>مؤشرات الأداء</h4>
            
            <div class="performance-metric ${metrics.CPI >= 1 ? 'positive' : 'negative'}">
              <span class="metric-name">${metricLabels['CPI']}:</span>
              <span class="metric-value">${metrics.CPI.toFixed(3)}</span>
              <span class="metric-interpretation">${getCPIInterpretation(metrics.CPI)}</span>
            </div>
            
            <div class="performance-metric ${metrics.SPI >= 1 ? 'positive' : 'negative'}">
              <span class="metric-name">${metricLabels['SPI']}:</span>
              <span class="metric-value">${metrics.SPI.toFixed(3)}</span>
              <span class="metric-interpretation">${getSPIInterpretation(metrics.SPI)}</span>
            </div>
            
            <div class="performance-metric ${cv >= 0 ? 'positive' : 'negative'}">
              <span class="metric-name">انحراف التكلفة (CV):</span>
              <span class="metric-value">${formatCurrency(cv)}</span>
              <span class="metric-interpretation">${getCVInterpretation(cv)}</span>
            </div>
            
            <div class="performance-metric ${sv >= 0 ? 'positive' : 'negative'}">
              <span class="metric-name">انحراف الجدول (SV):</span>
              <span class="metric-value">${formatCurrency(sv)}</span>
              <span class="metric-interpretation">${getSVInterpretation(sv)}</span>
            </div>
          </div>
          
          <div class="evm-forecast-card">
            <h4>التوقعات المستقبلية</h4>
            
            <div class="forecast-metric">
              <span class="metric-name">${metricLabels['EAC']}:</span>
              <span class="metric-value">${formatCurrency(metrics.EAC)}</span>
            </div>
            
            <div class="forecast-metric">
              <span class="metric-name">${metricLabels['ETC']}:</span>
              <span class="metric-value">${formatCurrency(metrics.ETC)}</span>
            </div>
            
            <div class="forecast-metric ${vac >= 0 ? 'positive' : 'negative'}">
              <span class="metric-name">انحراف عند الإكمال (VAC):</span>
              <span class="metric-value">${formatCurrency(vac)}</span>
              <span class="metric-interpretation">${getVACInterpretation(vac)}</span>
            </div>
            
            <div class="forecast-metric ${metrics.TCPI <= 1 ? 'positive' : 'negative'}">
              <span class="metric-name">${metricLabels['TCPI']}:</span>
              <span class="metric-value">${metrics.TCPI.toFixed(3)}</span>
              <span class="metric-interpretation">${getTCPIInterpretation(metrics.TCPI)}</span>
            </div>
          </div>
        </div>
        
        <div class="evm-summary">
          <h4>ملخص الأداء</h4>
          <p>${getOverallInterpretation(metrics)}</p>
        </div>
      `;
      
      $('#evm-out').innerHTML = html;
    }
    
    function formatCurrency(value) {
      return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(value);
    }
    
    function getCPIInterpretation(cpi) {
      if (cpi > 1) return 'تحت الميزانية (أداء جيد)';
      if (cpi < 1) return 'فوق الميزانية (أداء ضعيف)';
      return 'ضمن الميزانية (أداء حسب الخطة)';
    }
    
    function getSPIInterpretation(spi) {
      if (spi > 1) return 'متقدم عن الجدول (أداء جيد)';
      if (spi < 1) return 'متأخر عن الجدول (أداء ضعيف)';
      return 'ضمن الجدول (أداء حسب الخطة)';
    }
    
    function getCVInterpretation(cv) {
      if (cv > 0) return 'تحت الميزانية';
      if (cv < 0) return 'فوق الميزانية';
      return 'ضمن الميزانية';
    }
    
    function getSVInterpretation(sv) {
      if (sv > 0) return 'متقدم عن الجدول';
      if (sv < 0) return 'متأخر عن الجدول';
      return 'ضمن الجدول';
    }
    
    function getVACInterpretation(vac) {
      if (vac > 0) return 'متوقع توفير في الميزانية';
      if (vac < 0) return 'متوقع تجاوز للميزانية';
      return 'ضمن الميزانية المتوقعة';
    }
    
    function getTCPIInterpretation(tcpi) {
      if (tcpi <= 1) return 'يمكن تحقيق الأهداف الحالية';
      return 'صعوبة في تحقيق الأهداف الحالية';
    }
    
    function getOverallInterpretation(metrics) {
      if (metrics.CPI >= 1 && metrics.SPI >= 1) {
        return 'أداء ممتاز: المشروع تحت الميزانية ومتقدم عن الجدول الزمني.';
      } else if (metrics.CPI >= 1 && metrics.SPI < 1) {
        return 'أداء جيد من حيث التكلفة ولكن متأخر عن الجدول الزمني.';
      } else if (metrics.CPI < 1 && metrics.SPI >= 1) {
        return 'متقدم عن الجدول الزمني ولكن فوق الميزانية.';
      } else {
        return 'أداء ضعيف: المشروع فوق الميزانية ومتأخر عن الجدول الزمني.';
      }
    }
  };
    // Procurement sample - Fixed for the specific response format
  $('#btn-proc-run').onclick = async () => {
    const schedule = [
      {ItemCode:'C-001', Description:'Concrete C30', NeededOn:'2025-09-20', LeadDays:15, Qty:300},
      {ItemCode:'S-010', Description:'Rebar', NeededOn:'2025-09-10', LeadDays:15, Qty:40},
      {ItemCode:'F-020', Description:'Formwork', NeededOn:'2025-09-05', LeadDays:15, Qty:1500}
    ];
    
    try {
      $('#proc-out').innerHTML = '<div class="loading">جاري معالجة طلبات المشتريات...</div>';
      
      const res = await api('/api/procurement/trigger', {
        method: 'POST', 
        body: JSON.stringify({schedule})
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Display the procurement data in a user-friendly format
      displayProcurementData(data);
      
    } catch (error) {
      $('#proc-out').innerHTML = `
        <div class="error">خطأ في الاتصال: ${error.message}</div>
      `;
      console.error('Procurement Error:', error);
    }
    
    function displayProcurementData(data) {
      if (!data) {
        $('#proc-out').innerHTML = '<div class="no-data">لا توجد بيانات مشتريات</div>';
        return;
      }
      
      // Handle the specific response format: {count: X, alerts: [...]}
      if (!data.alerts || !Array.isArray(data.alerts)) {
        $('#proc-out').innerHTML = `
          <div class="info">تنسيق غير متوقع للبيانات:</div>
          <pre class="pre">${JSON.stringify(data, null, 2)}</pre>
        `;
        return;
      }
      
      const items = data.alerts;
      const count = data.count || items.length;
      
      if (items.length === 0) {
        $('#proc-out').innerHTML = '<div class="no-data">لا توجد طلبات مشتريات عاجلة</div>';
        return;
      }
      
      let html = `
        <div class="procurement-header">
          <h3>إنذارات المشتريات (15 يوم)</h3>
          <div class="procurement-count">عدد الإنذارات: ${count}</div>
        </div>
        
        <div class="procurement-alerts">
      `;
      
      items.forEach(item => {
        // Parse dates
        const neededDate = new Date(item.NeededOn);
        const triggerDate = new Date(item.Trigger);
        const today = new Date();
        
        // Calculate days until needed and days since trigger
        const daysUntilNeeded = Math.ceil((neededDate - today) / (1000 * 60 * 60 * 24));
        const daysSinceTrigger = Math.ceil((today - triggerDate) / (1000 * 60 * 60 * 24));
        
        // Determine alert level based on status
        let alertLevel = 'high';
        let alertIcon = '☠️';
        let alertText = 'خطر تأخير';
        
        if (item.Status && item.Status.includes('DELAY RISK')) {
          alertLevel = 'critical';
          alertIcon = '⚠️';
          alertText = 'خطر تأخير عالي';
        } else if (item.Status && item.Status.includes('WARNING')) {
          alertLevel = 'medium';
          alertIcon = '🔶';
          alertText = 'تحذير';
        } else {
          alertLevel = 'low';
          alertIcon = 'ℹ️';
          alertText = 'معلومة';
        }
        
        html += `
          <div class="alert-card ${alertLevel}">
            <div class="alert-header">
              <span class="alert-icon">${alertIcon}</span>
              <span class="alert-title">${alertText}</span>
              <span class="alert-item">${item.ItemCode} - ${item.Description}</span>
            </div>
            
            <div class="alert-details">
              <div class="detail-row">
                <span class="detail-label">الكمية:</span>
                <span class="detail-value">${item.Qty}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">مطلوب بتاريخ:</span>
                <span class="detail-value">${formatDate(neededDate)}</span>
                <span class="detail-extra">(${daysUntilNeeded} يوم متبقي)</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">تاريخ التفعيل:</span>
                <span class="detail-value">${formatDate(triggerDate)}</span>
                <span class="detail-extra">(${daysSinceTrigger} يوم مضى)</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">الحالة:</span>
                <span class="detail-status ${alertLevel}">${item.Status || 'غير محدد'}</span>
              </div>
            </div>
            
            <div class="alert-actions">
              <button class="action-btn primary">إنشاء طلب شراء</button>
              <button class="action-btn secondary">تأجيل لمدة أسبوع</button>
              <button class="action-btn">تم التعامل معه</button>
            </div>
          </div>
        `;
      });
      
      html += `
        </div>
        
        <div class="procurement-summary">
          <h4>ملخص إنذارات المشتريات</h4>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">إجمالي الإنذارات:</span>
              <span class="summary-value">${count}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">إنذارات حرجة:</span>
              <span class="summary-value critical">${items.filter(item => 
                item.Status && item.Status.includes('DELAY RISK')
              ).length}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">إنذارات متوسطة:</span>
              <span class="summary-value medium">${items.filter(item => 
                item.Status && item.Status.includes('WARNING')
              ).length}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">إنذارات منخفضة:</span>
              <span class="summary-value low">${items.filter(item => 
                !item.Status || (!item.Status.includes('DELAY RISK') && !item.Status.includes('WARNING'))
              ).length}</span>
            </div>
          </div>
          
          <div class="recommendation">
            <h5>التوصيات:</h5>
            <p>${getProcurementRecommendation(items)}</p>
          </div>
        </div>
      `;
      
      $('#proc-out').innerHTML = html;
    }
    
    function formatDate(date) {
      return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }
    
    function getProcurementRecommendation(items) {
      const criticalAlerts = items.filter(item => 
        item.Status && item.Status.includes('DELAY RISK')
      ).length;
      
      const warningAlerts = items.filter(item => 
        item.Status && item.Status.includes('WARNING')
      ).length;
      
      if (criticalAlerts > 0) {
        return 'هناك عناصر حرجة تحتاج إلى اهتمام فوري. يرجى معالجة طلبات الشراء هذه على وجه السرعة لتجنب التأخير في المشروع.';
      } else if (warningAlerts > 0) {
        return 'هناك عناصر تحتاج إلى مراجعة. يرجى معالجة طلبات الشراء هذه خلال الأسبوع القادم.';
      } else {
        return 'جميع عناصر المشتريات تحت السيطرة. لا توجد إنذارات حرجة في الوقت الحالي.';
      }
    }
  };
    // IFRS15 sample - Fixed for the specific response format
  $('#btn-ifrs').onclick = async () => {
    const payload = {
      contract_id: "HIKMA-001",
      items: [
        {name:"Initial Setup", price: 120000, method:"point", start:"2025-09"},
        {name:"Platform Subscription", price: 360000, method:"over_time", start:"2025-10", end:"2026-09"}
      ]
    };
    
    try {
      $('#ifrs-out').innerHTML = '<div class="loading">جاري حساب جدول الإيرادات...</div>';
      
      const res = await api('/api/ifrs15/schedule', {
        method: 'POST', 
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Display the IFRS15 data in a user-friendly format
      displayIFRS15Data(data);
      
    } catch (error) {
      $('#ifrs-out').innerHTML = `
        <div class="error">خطأ في الاتصال: ${error.message}</div>
      `;
      console.error('IFRS15 Error:', error);
    }
    
    function displayIFRS15Data(data) {
      if (!data) {
        $('#ifrs-out').innerHTML = '<div class="no-data">لا توجد بيانات IFRS15</div>';
        return;
      }
      
      // Handle the specific response format: {contract_id: "...", total: X, series: [...]}
      if (!data.series || !Array.isArray(data.series)) {
        $('#ifrs-out').innerHTML = `
          <div class="info">تنسيق غير متوقع للبيانات:</div>
          <pre class="pre">${JSON.stringify(data, null, 2)}</pre>
        `;
        return;
      }
      
      const series = data.series;
      const contractId = data.contract_id || 'غير محدد';
      const totalRevenue = data.total || series.reduce((sum, item) => sum + (item.revenue || 0), 0);
      
      if (series.length === 0) {
        $('#ifrs-out').innerHTML = '<div class="no-data">لا توجد بيانات في جدول الإيرادات</div>';
        return;
      }
      
      // Calculate cumulative revenue
      let cumulative = 0;
      const seriesWithCumulative = series.map(item => {
        cumulative += item.revenue || 0;
        return {
          ...item,
          cumulative_revenue: cumulative,
          percentage: ((cumulative / totalRevenue) * 100).toFixed(1)
        };
      });
      
      let html = `
        <div class="ifrs-header">
          <h3>جدول الاعتراف بالإيراد حسب معيار IFRS15</h3>
          <div class="contract-id">العقد: ${contractId}</div>
        </div>
        
        <div class="ifrs-summary">
          <h4>ملخص الإيرادات</h4>
          <div class="summary-grid">
            <div class="summary-item primary">
              <span class="summary-label">إجمالي قيمة العقد:</span>
              <span class="summary-value">${formatCurrency(totalRevenue)}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">عدد الفترات:</span>
              <span class="summary-value">${series.length}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">متوسط الإيراد الشهري:</span>
              <span class="summary-value">${formatCurrency(totalRevenue / series.length)}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">أول فترة:</span>
              <span class="summary-value">${series[0].period}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">آخر فترة:</span>
              <span class="summary-value">${series[series.length - 1].period}</span>
            </div>
          </div>
        </div>
        
        <div class="revenue-chart">
          <h4>توزيع الإيراد على الفترات</h4>
          <div class="chart-bars">
      `;
      
      // Find max revenue for scaling
      const maxRevenue = Math.max(...series.map(item => item.revenue || 0));
      
      seriesWithCumulative.forEach((item, index) => {
        const barHeight = ((item.revenue || 0) / maxRevenue) * 100;
        const isFirst = index === 0;
        const isLast = index === series.length - 1;
        
        html += `
          <div class="chart-bar-container">
            <div class="chart-bar" style="height: ${barHeight}%">
              <span class="bar-value">${formatCurrency(item.revenue)}</span>
            </div>
            <div class="chart-label">${item.period}</div>
            ${isFirst || isLast ? `<div class="chart-marker">${isFirst ? 'بداية' : 'نهاية'}</div>` : ''}
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
        
        <div class="revenue-table-section">
          <h4>جدول التفاصيل</h4>
          <div class="table-responsive">
            <table class="data-table revenue-table">
              <thead>
                <tr>
                  <th>الفترة</th>
                  <th>الإيراد الشهري</th>
                  <th>الإيراد المتراكم</th>
                  <th>نسبة الإنجاز</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      seriesWithCumulative.forEach(item => {
        const completionStatus = getCompletionStatus(item.percentage);
        
        html += `
          <tr>
            <td><strong>${item.period}</strong></td>
            <td class="revenue-amount">${formatCurrency(item.revenue)}</td>
            <td class="cumulative-amount">${formatCurrency(item.cumulative_revenue)}</td>
            <td class="percentage-cell">
              <div class="percentage-bar">
                <div class="percentage-fill" style="width: ${item.percentage}%"></div>
                <span class="percentage-text">${item.percentage}%</span>
              </div>
            </td>
            <td>
              <span class="status-badge ${completionStatus.class}">${completionStatus.text}</span>
            </td>
          </tr>
        `;
      });
      
      html += `
              </tbody>
              <tfoot>
                <tr>
                  <td><strong>المجموع</strong></td>
                  <td class="revenue-amount total">${formatCurrency(totalRevenue)}</td>
                  <td class="cumulative-amount total">${formatCurrency(totalRevenue)}</td>
                  <td class="percentage-cell total">100%</td>
                  <td><span class="status-badge completed">مكتمل</span></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
        <div class="revenue-insights">
          <h4>تحليل الإيرادات</h4>
          <div class="insights-grid">
            <div class="insight-card">
              <div class="insight-icon">📈</div>
              <div class="insight-content">
                <h5>أعلى إيراد شهري</h5>
                <p>${formatCurrency(Math.max(...series.map(item => item.revenue || 0)))}</p>
                <span class="insight-period">في ${series.reduce((max, item) => item.revenue > max.revenue ? item : max, series[0]).period}</span>
              </div>
            </div>
            
            <div class="insight-card">
              <div class="insight-icon">📉</div>
              <div class="insight-content">
                <h5>أقل إيراد شهري</h5>
                <p>${formatCurrency(Math.min(...series.map(item => item.revenue || 0)))}</p>
                <span class="insight-period">في ${series.reduce((min, item) => item.revenue < min.revenue ? item : min, series[0]).period}</span>
              </div>
            </div>
            
            <div class="insight-card">
              <div class="insight-icon">⏱️</div>
              <div class="insight-content">
                <h5>مدة العقد</h5>
                <p>${series.length} شهر</p>
                <span class="insight-period">من ${series[0].period} إلى ${series[series.length - 1].period}</span>
              </div>
            </div>
            
            <div class="insight-card">
              <div class="insight-icon">💰</div>
              <div class="insight-content">
                <h5>متوسط الإيراد</h5>
                <p>${formatCurrency(totalRevenue / series.length)}</p>
                <span class="insight-period">معدل شهري</span>
              </div>
            </div>
          </div>
        </div>
      `;
      
      $('#ifrs-out').innerHTML = html;
    }
    
    function formatCurrency(value) {
      return new Intl.NumberFormat('ar-SA', { 
        style: 'currency', 
        currency: 'SAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    
    function getCompletionStatus(percentage) {
      const percent = parseFloat(percentage);
      if (percent >= 100) return { class: 'completed', text: 'مكتمل' };
      if (percent >= 75) return { class: 'almost-done', text: 'شبه مكتمل' };
      if (percent >= 50) return { class: 'halfway', text: 'منتصف الطريق' };
      if (percent >= 25) return { class: 'in-progress', text: 'قيد التقدم' };
      return { class: 'just-started', text: 'بداية' };
    }
  };

  // Education
  $('#btn-edu-courses').onclick = async () => {
    const res = await api('/api/edu/courses?limit=50');
    const data = await res.json();
    $('#edu-courses').innerHTML = formatCards(data, 'name', ['code', 'duration', 'instructor']);
  };
  
  $('#btn-edu-students').onclick = async () => {
    const res = await api('/api/edu/students?limit=50');
    const data = await res.json();
    $('#edu-students').innerHTML = formatCards(data, 'name', ['id', 'email', 'phone']);
  };
  
  $('#btn-edu-enroll').onclick = async () => {
    const res = await api('/api/edu/enrollments?limit=100');
    const data = await res.json();
    $('#edu-enroll').innerHTML = formatTable(data, 'عمليات التسجيل');
  };
  
  $('#btn-edu-att').onclick = async () => {
    const res = await api('/api/edu/attendance?limit=100');
    const data = await res.json();
    $('#edu-att').innerHTML = formatTable(data, 'سجل الحضور');
  };

  // Admin seed controls
  $('#btn-seed-load').onclick = async () => {
    const res = await api('/api/admin/seed/load', {method:'POST'});
    const data = await res.json();
    $('#seed-out').innerHTML = formatKeyValue(data);
  };
  
  $('#btn-seed-clear').onclick = async () => {
    const res = await api('/api/admin/seed/clear', {method:'POST'});
    const data = await res.json();
    $('#seed-out').innerHTML = formatKeyValue(data);
  };

  // Report
  $('#btn-report').onclick = ()=> window.open(window.HARMAH_CONFIG.API_BASE + '/api/reports/demo', '_blank');

  // Default tab
  show('login');
})();