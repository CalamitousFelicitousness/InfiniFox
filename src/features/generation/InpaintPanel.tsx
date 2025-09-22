import { useState, useEffect } from 'react'

import { Dropdown } from '../../components/common/Dropdown'
import { NumberInput } from '../../components/common/NumberInput'
import { Slider } from '../../components/common/Slider'
import { LayerExportService } from '../../services/layers/LayerExportService'
import { useStore } from '../../store/store'

import { MaskEditor } from './MaskEditor'
import './InpaintPanel.css'

export function InpaintPanel() {
  const {
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    sampler,
    setSampler,
    samplers,
    seed,
    setSeed,
    steps,
    setSteps,
    cfgScale,
    setCfgScale,
    generateInpaint,
    isLoading,
    images,
    activeImageRoles,
    exportImageAsBase64,
    // Layer system state
    layers,
    selectedLayerIds,
    getLayer,
    activeLayerRoles,
    getLayerRole,
  } = useStore()

  const [baseImage, setBaseImage] = useState<string>('')
  const [maskImage, setMaskImage] = useState<string>('')
  const [denoisingStrength, setDenoisingStrength] = useState(0.75)
  const [maskBlur, setMaskBlur] = useState(4)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [useLayerSystem, setUseLayerSystem] = useState(false)

  const [inpaintingFill, setInpaintingFill] = useState<
    'fill' | 'original' | 'latent_noise' | 'latent_nothing'
  >('original')
  const [inpaintFullRes, setInpaintFullRes] = useState(true)
  const [inpaintFullResPadding, setInpaintFullResPadding] = useState(32)

  // Check if layer system is enabled
  useEffect(() => {
    setUseLayerSystem(Object.keys(layers).length > 0)
  }, [layers])

  // Auto-select from layers with roles or selection
  useEffect(() => {
    if (useLayerSystem) {
      // First check for layer with inpaint_image role
      const roleLayer = activeLayerRoles.find((r) => r.role === 'inpaint_image')
      if (roleLayer) {
        const layer = getLayer(roleLayer.layerId)
        if (layer && (layer.type === 'image' || layer.type === 'drawing')) {
          setSelectedLayerId(roleLayer.layerId)
          // Export layer as base64
          LayerExportService.exportLayerAsBase64(roleLayer.layerId)
            .then((base64) => {
              if (base64) {
                setBaseImage(base64)
              }
            })
            .catch((error) => {
              console.error('Failed to export layer:', error)
            })
          return
        }
      }

      // Fallback to selected layer if no role assigned
      if (selectedLayerIds.size > 0) {
        const firstSelectedId = Array.from(selectedLayerIds)[0]
        const layer = getLayer(firstSelectedId)
        if (layer && (layer.type === 'image' || layer.type === 'drawing')) {
          setSelectedLayerId(firstSelectedId)
          // Export layer as base64
          LayerExportService.exportLayerAsBase64(firstSelectedId)
            .then((base64) => {
              if (base64) {
                setBaseImage(base64)
              }
            })
            .catch((error) => {
              console.error('Failed to export layer:', error)
            })
        }
      } else {
        // No role or selection, clear
        setSelectedLayerId(null)
        setBaseImage('')
        setMaskImage('')
      }
    }
  }, [selectedLayerIds, useLayerSystem, getLayer, activeLayerRoles])

  // Auto-load image with inpaint_image role (legacy)
  useEffect(() => {
    if (useLayerSystem) return // Skip if using layer system

    const roleImage = activeImageRoles.find((r) => r.role === 'inpaint_image')
    if (roleImage) {
      const image = images.find((img) => img.id === roleImage.imageId)
      if (image) {
        exportImageAsBase64(roleImage.imageId)
          .then((base64) => {
            setBaseImage(base64)
            setSelectedImageId(roleImage.imageId)
            // Image dimensions can be handled by the mask editor
          })
          .catch((error) => {
            console.error('Failed to load role-assigned image:', error)
          })
      }
    } else {
      setBaseImage('')
      setSelectedImageId(null)
      setMaskImage('')
    }
  }, [activeImageRoles, images, exportImageAsBase64, useLayerSystem])

  const handleMaskDrawn = (maskDataUrl: string) => {
    // Convert data URL to base64
    const base64 = maskDataUrl.split(',')[1]
    setMaskImage(base64)
  }

  const handleGenerate = async (e: Event) => {
    e.preventDefault()

    // Export fresh base64 from layer or image
    let finalBase64 = baseImage

    if (useLayerSystem && selectedLayerId) {
      // Export from layer
      try {
        const exported = await LayerExportService.exportLayerAsBase64(selectedLayerId)
        if (exported) {
          finalBase64 = exported
        } else {
          alert('Failed to export layer')
          return
        }
      } catch (error) {
        console.error('Failed to export layer:', error)
        alert('Failed to export layer')
        return
      }
    } else if (selectedImageId) {
      // Export from legacy image
      try {
        finalBase64 = await exportImageAsBase64(selectedImageId)
      } catch (error) {
        console.error('Failed to export image:', error)
        alert('Failed to export image')
        return
      }
    }

    if (!finalBase64) {
      alert(
        useLayerSystem
          ? 'Please select a layer from canvas first'
          : 'Please select an image from canvas first'
      )
      return
    }
    if (!maskImage) {
      alert('Please draw a mask')
      return
    }
    if (!isLoading) {
      generateInpaint({
        baseImage: finalBase64,
        maskImage,
        denoisingStrength,
        maskBlur,
        inpaintingFill,
        inpaintFullRes,
        inpaintFullResPadding,
      })
    }
  }

  return (
    <div className="generation-panel">
      <h3 className="generation-panel-header">Inpainting</h3>

      {/* Layer/Image selection indicator */}
      {useLayerSystem && selectedLayerId && (
        <div
          className="selected-layer-info"
          style={{
            padding: '10px',
            backgroundColor:
              getLayerRole(selectedLayerId) === 'inpaint_image' ? '#dcfce7' : '#f0f0f0',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          {getLayerRole(selectedLayerId) === 'inpaint_image' && (
            <div style={{ fontSize: '12px', color: '#16a34a', marginBottom: '4px' }}>
              ✓ Role assigned
            </div>
          )}
          <div>Layer: {getLayer(selectedLayerId)?.name || selectedLayerId}</div>
        </div>
      )}
      {!useLayerSystem && selectedImageId && (
        <div
          className="selected-image-info"
          style={{
            padding: '10px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          Image selected: {selectedImageId.slice(-6)}
        </div>
      )}

      <form className="generation-form" onSubmit={handleGenerate}>
        {baseImage && (
          <div className="mask-section">
            <MaskEditor
              baseImage={`data:image/png;base64,${baseImage}`}
              onMaskUpdate={handleMaskDrawn}
              disabled={isLoading}
            />
          </div>
        )}

        <div className="prompt-group">
          <label className="prompt-label">Prompt</label>
          <textarea
            className="prompt-textarea"
            value={prompt}
            onInput={(e) => setPrompt(e.currentTarget.value)}
            disabled={isLoading}
            placeholder="Describe what should appear in the masked area..."
          />
        </div>

        <div className="prompt-group">
          <label className="prompt-label">Negative Prompt</label>
          <textarea
            className="prompt-textarea"
            value={negativePrompt}
            onInput={(e) => setNegativePrompt(e.currentTarget.value)}
            disabled={isLoading}
          />
        </div>

        <Slider
          label="Denoising Strength"
          value={denoisingStrength}
          onInput={setDenoisingStrength}
          min={0}
          max={1}
          step={0.05}
          disabled={isLoading}
        />

        <Slider
          label="Mask Blur"
          value={maskBlur}
          onInput={setMaskBlur}
          min={0}
          max={64}
          step={1}
          disabled={isLoading}
        />

        <Dropdown
          label="Inpainting Fill Mode"
          value={inpaintingFill}
          onInput={(val) =>
            setInpaintingFill(val as 'fill' | 'original' | 'latent_noise' | 'latent_nothing')
          }
          options={['fill', 'original', 'latent_noise', 'latent_nothing']}
          disabled={isLoading}
        />

        <div className="checkbox-group">
          <input
            type="checkbox"
            id="inpaint-full-res"
            className="checkbox-input"
            checked={inpaintFullRes}
            onChange={(e) => setInpaintFullRes(e.currentTarget.checked)}
            disabled={isLoading}
          />
          <div className="checkbox-box"></div>
          <label for="inpaint-full-res" className="checkbox-label">
            Inpaint at Full Resolution
          </label>
        </div>

        {inpaintFullRes && (
          <Slider
            label="Full Resolution Padding"
            value={inpaintFullResPadding}
            onInput={setInpaintFullResPadding}
            min={0}
            max={256}
            step={4}
            disabled={isLoading}
          />
        )}

        <Dropdown
          label="Sampler"
          value={sampler}
          onInput={setSampler}
          options={samplers.map((s) => s.name)}
          disabled={isLoading}
        />

        <NumberInput label="Seed" value={seed} onInput={setSeed} disabled={isLoading} />
        <Slider
          label="Steps"
          value={steps}
          onInput={setSteps}
          min={1}
          max={100}
          disabled={isLoading}
        />
        <Slider
          label="CFG Scale"
          value={cfgScale}
          onInput={setCfgScale}
          min={1}
          max={30}
          step={0.5}
          disabled={isLoading}
        />

        <div className="generation-actions">
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isLoading || !maskImage}
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </form>
    </div>
  )
}
