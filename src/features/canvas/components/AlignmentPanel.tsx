import React from 'react';
import { useStore } from '../../../store/store';
import {
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignTop,
  AlignCenterVertical,
  AlignBottom,
  Columns3,
  Rows3,
  Group,
  Ungroup,
  Lock,
  Unlock
} from 'lucide-react';

interface AlignmentPanelProps {
  className?: string;
}

export const AlignmentPanel: React.FC<AlignmentPanelProps> = ({ className = '' }) => {
  const {
    selectedIds,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,
    distributeHorizontally,
    distributeVertically,
    createGroup,
    dissolveGroup,
    getItemGroup,
    groups,
    lockGroup
  } = useStore();

  const selectedCount = selectedIds.size;
  const hasMultipleSelected = selectedCount >= 2;
  const canDistribute = selectedCount >= 3;

  // Check if selection is a group
  const selectedArray = Array.from(selectedIds);
  const isGroupSelected = selectedArray.length === 1 && groups.has(selectedArray[0]);
  const selectedGroup = isGroupSelected ? groups.get(selectedArray[0]) : null;

  // Check if selected items are already grouped
  const areItemsGrouped = selectedArray.some(id => {
    return Array.from(groups.values()).some(group => group.itemIds.has(id));
  });

  const handleCreateGroup = () => {
    if (selectedCount >= 2) {
      createGroup(selectedArray);
    }
  };

  const handleDissolveGroup = () => {
    if (isGroupSelected && selectedArray[0]) {
      dissolveGroup(selectedArray[0]);
    }
  };

  const handleToggleLock = () => {
    if (isGroupSelected && selectedArray[0] && selectedGroup) {
      lockGroup(selectedArray[0], !selectedGroup.locked);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div 
      className={`alignment-panel ${className}`}
      style={{
        position: 'absolute',
        top: '80px',
        right: '20px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 1000
      }}
    >
      {/* Selection Info */}
      <div style={{
        fontSize: '12px',
        color: '#666',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px',
        marginBottom: '4px'
      }}>
        {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        {isGroupSelected && selectedGroup && (
          <div style={{ marginTop: '4px' }}>
            Group: {selectedGroup.name}
            {selectedGroup.locked && ' (Locked)'}
          </div>
        )}
      </div>

      {/* Alignment Tools */}
      {hasMultipleSelected && (
        <>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => alignLeft()}
              title="Align Left"
              style={buttonStyle}
              disabled={isGroupSelected && selectedGroup?.locked}
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => alignCenter()}
              title="Align Center Horizontal"
              style={buttonStyle}
              disabled={isGroupSelected && selectedGroup?.locked}
            >
              <AlignCenterHorizontal size={16} />
            </button>
            <button
              onClick={() => alignRight()}
              title="Align Right"
              style={buttonStyle}
              disabled={isGroupSelected && selectedGroup?.locked}
            >
              <AlignRight size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => alignTop()}
              title="Align Top"
              style={buttonStyle}
              disabled={isGroupSelected && selectedGroup?.locked}
            >
              <AlignTop size={16} />
            </button>
            <button
              onClick={() => alignMiddle()}
              title="Align Center Vertical"
              style={buttonStyle}
              disabled={isGroupSelected && selectedGroup?.locked}
            >
              <AlignCenterVertical size={16} />
            </button>
            <button
              onClick={() => alignBottom()}
              title="Align Bottom"
              style={buttonStyle}
              disabled={isGroupSelected && selectedGroup?.locked}
            >
              <AlignBottom size={16} />
            </button>
          </div>
        </>
      )}

      {/* Distribution Tools */}
      {canDistribute && (
        <div style={{ 
          display: 'flex', 
          gap: '4px',
          borderTop: '1px solid #eee',
          paddingTop: '8px'
        }}>
          <button
            onClick={() => distributeHorizontally()}
            title="Distribute Horizontally"
            style={buttonStyle}
            disabled={isGroupSelected && selectedGroup?.locked}
          >
            <Columns3 size={16} />
          </button>
          <button
            onClick={() => distributeVertically()}
            title="Distribute Vertically"
            style={buttonStyle}
            disabled={isGroupSelected && selectedGroup?.locked}
          >
            <Rows3 size={16} />
          </button>
        </div>
      )}

      {/* Grouping Tools */}
      <div style={{ 
        display: 'flex', 
        gap: '4px',
        borderTop: '1px solid #eee',
        paddingTop: '8px'
      }}>
        {!isGroupSelected && hasMultipleSelected && !areItemsGrouped && (
          <button
            onClick={handleCreateGroup}
            title="Group Selection (Ctrl+G)"
            style={buttonStyle}
          >
            <Group size={16} />
          </button>
        )}
        
        {isGroupSelected && (
          <>
            <button
              onClick={handleDissolveGroup}
              title="Ungroup (Ctrl+Shift+G)"
              style={buttonStyle}
              disabled={selectedGroup?.locked}
            >
              <Ungroup size={16} />
            </button>
            <button
              onClick={handleToggleLock}
              title={selectedGroup?.locked ? "Unlock Group" : "Lock Group"}
              style={{
                ...buttonStyle,
                background: selectedGroup?.locked ? '#fef3c7' : 'white'
              }}
            >
              {selectedGroup?.locked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
          </>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div style={{
        fontSize: '10px',
        color: '#999',
        borderTop: '1px solid #eee',
        paddingTop: '8px',
        marginTop: '4px'
      }}>
        <div>Ctrl+G: Group</div>
        <div>Ctrl+Shift+G: Ungroup</div>
        <div>Ctrl+[/]: Layer order</div>
      </div>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  padding: '8px',
  background: 'white',
  border: '1px solid #ddd',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  flex: 1
};
