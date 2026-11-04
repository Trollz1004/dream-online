import React, { useEffect, useRef, useState } from 'react';
import {
  APPEARANCE_PRESETS,
  BODY_SILHOUETTES,
  CREATOR_ROWS,
  CREATOR_SLIDER_SPECS,
  EYE_STYLES,
  FACE_PRESETS,
  HAIR_COLORS,
  HAIR_SHAPES,
  KID_SAFE_BASICS,
  SKIN_TONES,
  STARTER_COMBAT_PATHS,
  STARTER_LIFE_SKILLS,
  VOICE_STYLES,
  applyAppearancePreset,
  leaveCharacterCreator,
  parseVrmBinary,
  resetAllCreatorSliders,
  resetCreatorSlider,
  updateCreatorSlider,
  type AppearancePresetId,
  type BodySilhouetteId,
  type CharacterCreatorExitState,
  type CharacterCreatorState,
  type CreatorOptionItem,
  type CreatorRowId,
  type CreatorSliderKey,
  type EyeStyleId,
  type FacePresetId,
  type HairColorId,
  type HairShapeId,
  type SkinToneId,
  type StarterCombatPathId,
  type StarterLifeSkillId,
  type VrmImportResult,
  type VoiceStyleId,
} from './characterCreatorConfig';

export interface CharacterCreatorModalProps {
  isOpen: boolean;
  state: CharacterCreatorState;
  onChange: (next: CharacterCreatorState) => void;
  onClose: (exitState: CharacterCreatorExitState) => void;
}

const FONT_STACK = '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif';

export const CharacterCreatorModal: React.FC<CharacterCreatorModalProps> = ({
  isOpen,
  state,
  onChange,
  onClose,
}) => {
  const [selectedRow, setSelectedRow] = useState<CreatorRowId>('appearancePreset');
  const [vrmStatus, setVrmStatus] = useState<VrmImportResult | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setIsCompactViewport(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose(leaveCharacterCreator(state));
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const idx = CREATOR_ROWS.findIndex((r) => r.id === selectedRow);
        if (idx === -1) return;
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const nextIdx = (idx + delta + CREATOR_ROWS.length) % CREATOR_ROWS.length;
        setSelectedRow(CREATOR_ROWS[nextIdx].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedRow, state]);

  if (!isOpen) return null;

  const activeRowMeta =
    CREATOR_ROWS.find((row) => row.id === selectedRow) ?? CREATOR_ROWS[0];

  const handleBack = () => {
    onClose(leaveCharacterCreator(state));
  };

  const handleVrmFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const result = parseVrmBinary(buffer, file.name);
    setVrmStatus(result);
  };

  const renderSelectControl = <T extends string>(
    rowId: CreatorRowId,
    value: T,
    options: readonly CreatorOptionItem<T>[],
    onSelect: (val: T) => void,
  ) => (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '32px',
        backgroundColor: 'rgba(10, 10, 12, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <select
        aria-label={rowId}
        value={value}
        onFocus={() => setSelectedRow(rowId)}
        onChange={(e) => onSelect(e.target.value as T)}
        style={{
          width: '100%',
          height: '100%',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          backgroundColor: 'transparent',
          color: '#F5F5F7',
          border: 'none',
          padding: isCompactViewport ? '0 26px 0 10px' : '0 32px 0 12px',
          fontSize: '14px',
          fontWeight: 400,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          fontFamily: FONT_STACK,
          cursor: 'pointer',
          outline: 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {options.map((opt) => (
          <option
            key={opt.id}
            value={opt.id}
            style={{
              backgroundColor: '#0C0C0E',
              color: '#F5F5F7',
            }}
          >
            {opt.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '10px',
          pointerEvents: 'none',
          color: '#D1D1D6',
          fontSize: '14px',
          lineHeight: 1,
        }}
      >
        ▾
      </span>
    </div>
  );

  const renderSliderControl = (key: CreatorSliderKey) => {
    const spec = CREATOR_SLIDER_SPECS[key];
    const currentValue = state[key];
    const ratio = Math.max(
      0,
      Math.min(1, (currentValue - spec.min) / (spec.max - spec.min)),
    );
    const formattedValue =
      spec.unit === '°'
        ? `${Math.round(currentValue)}${spec.unit}`
        : `${currentValue.toFixed(2)}${spec.unit}`;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          height: '32px',
        }}
      >
        <button
          type="button"
          data-testid={`reset-slider-${key}`}
          title={`Reset ${spec.label}`}
          aria-label={`Reset ${spec.label}`}
          onClick={() => {
            setSelectedRow(key);
            onChange(resetCreatorSlider(state, key));
          }}
          style={{
            width: '32px',
            height: '32px',
            flexShrink: 0,
            backgroundColor: 'rgba(10, 10, 12, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            color: '#E5E5EA',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            fontFamily: FONT_STACK,
          }}
        >
          ↺
        </button>
        <div
          style={{
            position: 'relative',
            flex: 1,
            height: '32px',
            backgroundColor: 'rgba(10, 10, 12, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            overflow: 'hidden',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.round(ratio * 100)}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="range"
            aria-label={spec.label}
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={currentValue}
            onFocus={() => setSelectedRow(key)}
            onChange={(e) => {
              setSelectedRow(key);
              onChange(updateCreatorSlider(state, key, parseFloat(e.target.value)));
            }}
            style={{
              width: '100%',
              margin: 0,
              accentColor: '#F5F5F7',
              background: 'transparent',
              cursor: 'pointer',
              zIndex: 1,
            }}
          />
          <span
            style={{
              marginLeft: '10px',
              fontSize: '14px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#F5F5F7',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
              zIndex: 1,
            }}
          >
            {formattedValue}
          </span>
        </div>
      </div>
    );
  };

  const renderRowControl = (rowId: CreatorRowId) => {
    switch (rowId) {
      case 'appearancePreset':
        return renderSelectControl<AppearancePresetId>(
          rowId,
          state.appearancePreset,
          APPEARANCE_PRESETS,
          (val) => onChange(applyAppearancePreset(state, val)),
        );
      case 'silhouette':
        return renderSelectControl<BodySilhouetteId>(
          rowId,
          state.silhouette,
          BODY_SILHOUETTES,
          (val) => onChange({ ...state, silhouette: val }),
        );
      case 'facePreset':
        return renderSelectControl<FacePresetId>(
          rowId,
          state.facePreset,
          FACE_PRESETS,
          (val) => onChange({ ...state, facePreset: val }),
        );
      case 'skinTone':
        return renderSelectControl<SkinToneId>(
          rowId,
          state.skinTone,
          SKIN_TONES,
          (val) => onChange({ ...state, skinTone: val }),
        );
      case 'hairShape':
        return renderSelectControl<HairShapeId>(
          rowId,
          state.hairShape,
          HAIR_SHAPES,
          (val) => onChange({ ...state, hairShape: val }),
        );
      case 'hairColor':
        return renderSelectControl<HairColorId>(
          rowId,
          state.hairColor,
          HAIR_COLORS,
          (val) => onChange({ ...state, hairColor: val }),
        );
      case 'eyeStyle':
        return renderSelectControl<EyeStyleId>(
          rowId,
          state.eyeStyle,
          EYE_STYLES,
          (val) => onChange({ ...state, eyeStyle: val }),
        );
      case 'voiceStyle':
        return renderSelectControl<VoiceStyleId>(
          rowId,
          state.voiceStyle,
          VOICE_STYLES,
          (val) => onChange({ ...state, voiceStyle: val }),
        );
      case 'combatPath':
        return renderSelectControl<StarterCombatPathId>(
          rowId,
          state.combatPath,
          STARTER_COMBAT_PATHS,
          (val) => onChange({ ...state, combatPath: val }),
        );
      case 'lifeSkillInterest':
        return renderSelectControl<StarterLifeSkillId>(
          rowId,
          state.lifeSkillInterest,
          STARTER_LIFE_SKILLS,
          (val) => onChange({ ...state, lifeSkillInterest: val }),
        );
      case 'heightScale':
      case 'shoulderWidth':
      case 'torsoBuild':
      case 'headScale':
      case 'hairLength':
      case 'previewYawDeg':
        return renderSliderControl(rowId);
    }
  };

  const activeCombatPath =
    STARTER_COMBAT_PATHS.find((c) => c.id === state.combatPath) ?? STARTER_COMBAT_PATHS[0];
  const activeLifeSkill =
    STARTER_LIFE_SKILLS.find((l) => l.id === state.lifeSkillInterest) ?? STARTER_LIFE_SKILLS[0];
  const activeSilhouette =
    BODY_SILHOUETTES.find((s) => s.id === state.silhouette) ?? BODY_SILHOUETTES[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Character Creator"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        backgroundColor: 'rgba(10, 10, 12, 0.56)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
        color: '#F5F5F7',
        fontFamily: FONT_STACK,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isCompactViewport ? '14px 14px 12px' : '28px 48px 22px',
        boxSizing: 'border-box',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Top Header: Large, thin, light title at top left with a fine horizontal rule */}
      <header style={{ flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: isCompactViewport ? 'column' : 'row',
            alignItems: isCompactViewport ? 'flex-start' : 'baseline',
            justifyContent: 'space-between',
            gap: isCompactViewport ? '2px' : '16px',
            paddingBottom: isCompactViewport ? '8px' : '12px',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: isCompactViewport ? '30px' : '44px',
              fontWeight: 200,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#F5F5F7',
              lineHeight: 1.08,
            }}
          >
            CHARACTER CREATOR
          </h1>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 300,
              letterSpacing: '0.06em',
              color: '#C7C7CC',
            }}
          >
            CLAUDE&apos;s N Joshua&apos;s · #TeamClaudeForLife
          </div>
        </div>
        <div
          style={{
            width: '100%',
            height: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.22)',
          }}
        />
      </header>

      {/* Main Content Area: Three columns on desktop (names left, dark value boxes/sliders middle, help panel right) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: isCompactViewport
            ? '1fr'
            : 'minmax(210px, 27%) minmax(280px, 37%) minmax(260px, 36%)',
          gap: isCompactViewport ? '10px' : '28px',
          paddingTop: isCompactViewport ? '8px' : '14px',
          paddingBottom: isCompactViewport ? '8px' : '14px',
          alignItems: 'start',
          overflowY: isCompactViewport ? 'auto' : 'visible',
        }}
      >
        {isCompactViewport ? (
          /* Compact / Phone View: Paired rows + Help Panel stacked cleanly without squishing text */
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              {CREATOR_ROWS.map((row) => {
                const isChosen = row.id === selectedRow;
                return (
                  <div
                    key={row.id}
                    onClick={() => setSelectedRow(row.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '44% 56%',
                      alignItems: 'center',
                      minHeight: '34px',
                      padding: '2px 8px',
                      backgroundColor: isChosen
                        ? 'rgba(255, 255, 255, 0.14)'
                        : 'rgba(12, 12, 14, 0.42)',
                      borderLeft: isChosen
                        ? '2px solid rgba(255, 255, 255, 0.85)'
                        : '2px solid transparent',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: isChosen ? 400 : 300,
                        color: isChosen ? '#F5F5F7' : '#D1D1D6',
                        paddingRight: '8px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {row.label}
                    </span>
                    <div>{renderRowControl(row.id)}</div>
                  </div>
                );
              })}
            </div>

            <aside
              aria-label="Setting Help"
              style={{
                backgroundColor: 'rgba(10, 10, 12, 0.68)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 400,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#F5F5F7',
                  marginBottom: '6px',
                }}
              >
                {activeRowMeta.helpTitle}
              </div>
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  lineHeight: 1.45,
                  color: '#D1D1D6',
                }}
              >
                {activeRowMeta.helpBody[0]}
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  fontSize: '14px',
                  color: '#C7C7CC',
                }}
              >
                <span>
                  Basics: {KID_SAFE_BASICS.top.name}, {KID_SAFE_BASICS.bottom.name},{' '}
                  {KID_SAFE_BASICS.shoes.name}
                </span>
                <a
                  href="#wardrobe"
                  onClick={(e) => e.preventDefault()}
                  style={{
                    color: '#F5F5F7',
                    textDecoration: 'underline',
                    fontSize: '14px',
                  }}
                >
                  Wardrobe
                </a>
              </div>
            </aside>
          </>
        ) : (
          /* Desktop Three-Column Layout matching docs/gdd/09-interface-style.md */
          <>
            {/* Column 1 (Left): Option names, one per row, with a soft highlight bar on the chosen row */}
            <div
              role="listbox"
              aria-label="Character Creator Options"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              {CREATOR_ROWS.map((row) => {
                const isChosen = row.id === selectedRow;
                return (
                  <div
                    key={row.id}
                    role="option"
                    aria-selected={isChosen}
                    onMouseEnter={() => setSelectedRow(row.id)}
                    onClick={() => setSelectedRow(row.id)}
                    style={{
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 14px',
                      cursor: 'pointer',
                      backgroundColor: isChosen
                        ? 'rgba(255, 255, 255, 0.14)'
                        : 'transparent',
                      borderLeft: isChosen
                        ? '2px solid rgba(255, 255, 255, 0.88)'
                        : '2px solid transparent',
                      color: isChosen ? '#F5F5F7' : '#D1D1D6',
                      fontSize: '15px',
                      fontWeight: isChosen ? 400 : 300,
                      letterSpacing: '0.02em',
                      transition: 'background-color 120ms ease',
                    }}
                  >
                    {row.label}
                  </div>
                );
              })}
            </div>

            {/* Column 2 (Middle): Dark value boxes in small capitals with drop-down arrows & sliders with reset */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              {CREATOR_ROWS.map((row) => (
                <div
                  key={row.id}
                  onMouseEnter={() => setSelectedRow(row.id)}
                  style={{
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {renderRowControl(row.id)}
                </div>
              ))}
            </div>

            {/* Column 3 (Right): Plain-sentence help panel */}
            <aside
              aria-label="Setting Description"
              style={{
                backgroundColor: 'rgba(10, 10, 12, 0.52)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.16)',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    fontWeight: 300,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#F5F5F7',
                  }}
                >
                  {activeRowMeta.helpTitle}
                </h2>
                <div
                  style={{
                    width: '100%',
                    height: '1px',
                    backgroundColor: 'rgba(255, 255, 255, 0.14)',
                    marginBottom: '12px',
                  }}
                />
                {activeRowMeta.helpBody.map((sentence, idx) => (
                  <p
                    key={idx}
                    style={{
                      margin: idx === 0 ? '0 0 10px 0' : 0,
                      fontSize: '15px',
                      lineHeight: 1.55,
                      fontWeight: 300,
                      color: '#E5E5EA',
                    }}
                  >
                    {sentence}
                  </p>
                ))}
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.14)',
                  paddingTop: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: '#D1D1D6',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#F5F5F7',
                  }}
                >
                  LIVE SCENE BODY SUMMARY
                </div>
                <div>Frame: {activeSilhouette.label}</div>
                <div>Combat Path: {activeCombatPath.label}</div>
                <div>Life-Skill Interest: {activeLifeSkill.label}</div>
                <div>
                  Exit Attire: {KID_SAFE_BASICS.top.name} · {KID_SAFE_BASICS.bottom.name} ·{' '}
                  {KID_SAFE_BASICS.shoes.name}
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.14)',
                  paddingTop: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    lineHeight: 1.5,
                    color: '#C7C7CC',
                  }}
                >
                  The creator shapes your character body only. Every character enters the
                  world wearing the three-piece basics set. Outfits and wardrobe changes
                  happen outside this screen.
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".vrm,.glb"
                    onChange={handleVrmFileChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      height: '32px',
                      padding: '0 14px',
                      backgroundColor: 'rgba(10, 10, 12, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#F5F5F7',
                      fontSize: '14px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontFamily: FONT_STACK,
                      cursor: 'pointer',
                    }}
                  >
                    IMPORT VRM (.VRM)
                  </button>

                  <button
                    type="button"
                    onClick={() => onChange(resetAllCreatorSliders(state))}
                    style={{
                      height: '32px',
                      padding: '0 14px',
                      backgroundColor: 'rgba(10, 10, 12, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#D1D1D6',
                      fontSize: '14px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontFamily: FONT_STACK,
                      cursor: 'pointer',
                    }}
                  >
                    RESET ALL SLIDERS
                  </button>

                  <a
                    href="#wardrobe"
                    onClick={(e) => e.preventDefault()}
                    style={{
                      color: '#F5F5F7',
                      fontSize: '14px',
                      letterSpacing: '0.06em',
                      textDecoration: 'underline',
                      textTransform: 'uppercase',
                      padding: '4px 2px',
                    }}
                  >
                    Wardrobe
                  </a>
                </div>

                {vrmStatus && (
                  <div
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.45,
                      color: '#E5E5EA',
                      backgroundColor: 'rgba(10, 10, 12, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      padding: '8px 10px',
                    }}
                  >
                    {vrmStatus.ok
                      ? `Imported VRM: ${vrmStatus.title} (${vrmStatus.version ?? '1.0'}) — commercial and redistribution verified.`
                      : `VRM rejected: ${vrmStatus.reason}`}
                  </div>
                )}
              </div>
            </aside>
          </>
        )}
      </div>

      {/* Bottom Footer: Fine horizontal rule + one Back control at the bottom centre */}
      <footer style={{ flexShrink: 0 }}>
        <div
          style={{
            width: '100%',
            height: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.22)',
            marginBottom: isCompactViewport ? '8px' : '14px',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={handleBack}
            style={{
              height: '36px',
              padding: '0 28px',
              backgroundColor: 'rgba(10, 10, 12, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.24)',
              color: '#F5F5F7',
              fontSize: '15px',
              fontWeight: 300,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: FONT_STACK,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                padding: '1px 6px',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                color: '#D1D1D6',
              }}
            >
              ESC
            </span>
            <span>Back</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
