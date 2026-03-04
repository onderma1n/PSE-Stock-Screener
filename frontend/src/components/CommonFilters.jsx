import React, { useState } from 'react';
import { COMMON_FILTERS } from '../config/strategies';

const CommonFilters = ({ filters, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // === Handler cho Multi-select Sector ===
  const handleSectorToggle = (sectorValue) => {
    const currentSectors = filters.sectors || [];
    const updated = currentSectors.includes(sectorValue)
      ? currentSectors.filter(s => s !== sectorValue)
      : [...currentSectors, sectorValue];
    onChange({ ...filters, sectors: updated });
  };

  const handleSelectAllSectors = () => {
    const allValues = COMMON_FILTERS.sector.options.map(o => o.value);
    const currentSectors = filters.sectors || [];
    const isAllSelected = allValues.length === currentSectors.length;
    onChange({ ...filters, sectors: isAllSelected ? [] : allValues });
  };

  // === Handler cho Checkbox ===
  const handleCheckboxChange = (checkboxId) => {
    onChange({ ...filters, [checkboxId]: !filters[checkboxId] });
  };

  const selectedSectors = filters.sectors || [];

  return (
    <div className="common-filters">
      {/* Header */}
      <div
        className="common-filters__header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3>
          🔧 Bộ lọc chung
          {(selectedSectors.length > 0 || Object.keys(filters).some(k => k !== 'sectors' && filters[k] === true)) && (
            <span className="filter-badge">Đang lọc</span>
          )}
        </h3>
        <span className={`arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </div>

      {isExpanded && (
        <div className="common-filters__body">
          {/* ============ MULTI-SELECT SECTOR ============ */}
          <div className="filter-section">
            <label className="filter-section__label">
              {COMMON_FILTERS.sector.label}
              <span className="tooltip-icon" title={COMMON_FILTERS.sector.tooltip}>ℹ️</span>
            </label>
            <p className="filter-section__hint">
              {selectedSectors.length === 0
                ? 'Tất cả ngành (không lọc)'
                : `Đã chọn ${selectedSectors.length} ngành`}
            </p>

            {/* Select All */}
            <div className="sector-option select-all">
              <label>
                <input
                  type="checkbox"
                  checked={selectedSectors.length === COMMON_FILTERS.sector.options.length}
                  onChange={handleSelectAllSectors}
                />
                <span>Chọn tất cả / Bỏ chọn tất cả</span>
              </label>
            </div>

            {/* Sector checkboxes */}
            <div className="sector-grid">
              {COMMON_FILTERS.sector.options.map(option => (
                <div key={option.value} className="sector-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedSectors.includes(option.value)}
                      onChange={() => handleSectorToggle(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* ============ CHECKBOX OPTIONS ============ */}
          <div className="filter-section">
            <label className="filter-section__label">Tùy chọn lọc</label>
            <div className="checkbox-grid">
              {COMMON_FILTERS.checkboxes.map(cb => (
                <div key={cb.id} className="checkbox-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={filters[cb.id] || false}
                      onChange={() => handleCheckboxChange(cb.id)}
                    />
                    <span>{cb.label}</span>
                    <span className="tooltip-icon" title={cb.tooltip}>ℹ️</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommonFilters;