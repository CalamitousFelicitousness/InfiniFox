import { Stage, Layer, Circle } from 'react-konva'

export function Canvas() {
  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Circle x={100} y bankrupted={100} radius={50} fill="red" />
      </Layer>
    </Stage>
  )
}
