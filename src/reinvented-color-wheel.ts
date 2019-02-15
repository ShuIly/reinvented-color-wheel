import _hsl2hsv from 'pure-color/convert/hsl2hsv'
import _hsv2hsl from 'pure-color/convert/hsv2hsl'
import _rgb2hsv from './rgb2hsv'
import _hsv2rgb from './hsv2rgb'
import _rgb2hex from 'pure-color/convert/rgb2hex'
import _hex2rgb from 'pure-color/parse/hex'
import { normalizeHsvOrDefault, normalizeHsl } from './normalize'

const pointerEventSupported = 'PointerEvent' in window

export interface ReinventedColorWheelOptions {
	readonly appendTo: HTMLElement
	readonly hsv?: number[]
	readonly hsl?: number[]
	readonly rgb?: number[]
	readonly hex?: string
	readonly wheelDiameter?: number
	readonly wheelThickness?: number
	readonly handleDiameter?: number
	readonly wheelReflectsSaturation?: boolean
	readonly onChange?: (color: ReinventedColorWheel) => any
}

const defaultOptions = {
	hsv: [0, 100, 100],
	hsl: [0, 100, 50],
	wheelDiameter: 200,
	wheelThickness: 20,
	handleDiameter: 16,
	wheelReflectsSaturation: true,
	onChange: (() => { }) as NonNullable<ReinventedColorWheelOptions['onChange']>,
}

export default class ReinventedColorWheel {
	static default = ReinventedColorWheel
	static defaultOptions = defaultOptions
	static hsv2hsl = _hsv2hsl
	static hsl2hsv = _hsl2hsv
	static hsv2rgb = _hsv2rgb
	static rgb2hsv = _rgb2hsv
	static rgb2hex = _rgb2hex
	static hex2rgb = _hex2rgb

	wheelDiameter = this._option('wheelDiameter')
	wheelThickness = this._option('wheelThickness')
	handleDiameter = this._option('handleDiameter')
	onChange = this._option('onChange')
	wheelReflectsSaturation = this._option('wheelReflectsSaturation')

	rootElement = this.options.appendTo.appendChild(createElementWithClass('div', 'reinvented-color-wheel'))
	hueWheelElement = this.rootElement.appendChild(createElementWithClass('canvas', 'reinvented-color-wheel--hue-wheel'))
	hueWheelContext = this.hueWheelElement.getContext('2d')!
	hueHandleElement = this.rootElement.appendChild(createElementWithClass('div', 'reinvented-color-wheel--hue-handle'))
	svSpaceElement = this.rootElement.appendChild(createElementWithClass('canvas', 'reinvented-color-wheel--sv-space'))
	svSpaceContext = this.svSpaceElement.getContext('2d')!
	svHandleElement = this.rootElement.appendChild(createElementWithClass('div', 'reinvented-color-wheel--sv-handle'))

	private _redrawHueWheelRequested: boolean | undefined

	private _hsv: number[]
	private _hsl: number[]
	private _rgb: number[]
	private _hex: string

	private hueOnDragStart: Function;
	private svOnDragStart: Function;

	get hsv() { return this._hsv }
	get hsl() { return this._hsl }
	get rgb() { return this._rgb }
	get hex() { return this._hex }

	set hsv(value) { this._setHSV(value) }
	set hsl(value) { this._setHSV(ReinventedColorWheel.hsl2hsv(value)) }
	set rgb(value) { this._setHSV(ReinventedColorWheel.rgb2hsv(value)) }
	set hex(value) { this.rgb = ReinventedColorWheel.hex2rgb(value) }

  /** @deprecated */ setHSV() { this.hsv = arguments as any as number[] }
  /** @deprecated */ setHSL() { this.hsl = arguments as any as number[] }

	constructor(private options: ReinventedColorWheelOptions) {
		this.hueWheelContext.imageSmoothingEnabled = false
		this.svSpaceContext.imageSmoothingEnabled = false

		this._hsv = normalizeHsvOrDefault(
			options.hsv ? options.hsv :
				options.hsl ? ReinventedColorWheel.hsl2hsv(options.hsl) :
					options.rgb ? ReinventedColorWheel.rgb2hsv(options.rgb) :
						options.hex ? ReinventedColorWheel.rgb2hsv(ReinventedColorWheel.hex2rgb(options.hex)) :
							undefined,
			defaultOptions.hsv
		)
		this._hsl = normalizeHsl(ReinventedColorWheel.hsv2hsl(this._hsv))
		this._rgb = ReinventedColorWheel.hsv2rgb(this._hsv)
		this._hex = ReinventedColorWheel.rgb2hex(this._rgb)

		this.hueOnDragStart = (event: any) => {
			if (event.button === 0) {
				this._onMoveHueHandle(event);
			}
			var fn = (event: any) => {
				this._onMoveHueHandle(event);
			};
			var stop = () => {
				// @ts-ignore
				__zone_symbol__removeEventListener(pointerEventSupported ? 'pointermove' : 'mousemove', fn);
				// @ts-ignore
				__zone_symbol__removeEventListener(pointerEventSupported ? 'pointerup' : 'mouseup', stop);
			};
			// @ts-ignore
			__zone_symbol__addEventListener(pointerEventSupported ? 'pointermove' : 'mousemove', fn);
			// @ts-ignore
			__zone_symbol__addEventListener(pointerEventSupported ? 'pointerup' : 'mouseup', stop);

		};

		this.svOnDragStart = (event: any) => {
			if (event.button === 0) {
				this._onMoveSvHandle(event);
			}
			var fn = (event: any) => {
				this._onMoveSvHandle(event);
			};
			var stop = () => {
				// @ts-ignore
				__zone_symbol__removeEventListener(pointerEventSupported ? 'pointermove' : 'mousemove', fn);
				// @ts-ignore
				__zone_symbol__removeEventListener(pointerEventSupported ? 'pointerup' : 'mouseup', stop);
			};
			// @ts-ignore
			__zone_symbol__addEventListener(pointerEventSupported ? 'pointermove' : 'mousemove', fn);
			// @ts-ignore
			__zone_symbol__addEventListener(pointerEventSupported ? 'pointerup' : 'mouseup', stop);

		};

		// @ts-ignore
		this.hueWheelElement.__zone_symbol__addEventListener(pointerEventSupported ? 'pointerdown' : 'mousedown', this.hueOnDragStart);
		// @ts-ignore
		this.svSpaceElement.__zone_symbol__addEventListener(pointerEventSupported ? 'pointerdown' : 'mousedown', this.svOnDragStart);


		this.redraw()
	}

	redraw() {
		this.hueWheelElement.width = this.hueWheelElement.height = this.wheelDiameter
		this.svSpaceElement.width = this.svSpaceElement.height = (this.wheelDiameter - this.wheelThickness * 2) * Math.sqrt(2) / 2

		const hueHandleStyle = this.hueHandleElement.style
		const svHandleStyle = this.svHandleElement.style
		hueHandleStyle.width = hueHandleStyle.height = svHandleStyle.width = svHandleStyle.height = `${this.handleDiameter}px`
		hueHandleStyle.marginLeft = hueHandleStyle.marginTop = svHandleStyle.marginLeft = svHandleStyle.marginTop = `${-this.handleDiameter / 2}px`

		this._redrawHueWheel()
		this._redrawHueHandle()
		this._redrawSvSpace()
		this._redrawSvHandle()
	}

	destroy() {
		// @ts-ignore
		this.hueWheelElement.__zone_symbol__removeEventListener(pointerEventSupported ? 'pointerdown' : 'mousedown', this.hueOnDragStart);
		// @ts-ignore
		this.svSpaceElement.__zone_symbol__removeEventListener(pointerEventSupported ? 'pointerdown' : 'mousedown', this.svOnDragStart);
	}

	private _setHSV(hsv: number[]) {
		const oldHsv = this._hsv
		const newHsv = this._hsv = normalizeHsvOrDefault(hsv, oldHsv)
		const hueChanged = oldHsv[0] - newHsv[0]
		const svChanged = oldHsv[1] - newHsv[1] || oldHsv[2] - newHsv[2]
		if (hueChanged) {
			this._hsl[0] = newHsv[0]
			this._redrawHueHandle()
			this._updateSvBackground()
		}
		if (svChanged) {
			this._hsl = normalizeHsl(ReinventedColorWheel.hsv2hsl(newHsv))
			this._redrawSvHandle()
			if (this.wheelReflectsSaturation && !this._redrawHueWheelRequested) {
				// @ts-ignore
				__zone_symbol__requestAnimationFrame(this._redrawHueWheel)
				this._redrawHueWheelRequested = true
			}
		}
		if (hueChanged || svChanged) {
			this._rgb = ReinventedColorWheel.hsv2rgb(newHsv)
			this._hex = ReinventedColorWheel.rgb2hex(this._rgb)
			this.onChange(this)
		}
	}

	private _redrawHueWheel = () => {
		this._redrawHueWheelRequested = false
		const wheelDiameter = this.wheelDiameter
		const center = wheelDiameter / 2
		const radius = center - this.wheelThickness / 2
		const TO_RAD = Math.PI / 180
		const hslPostfix = this.wheelReflectsSaturation ? `,${this._hsl[1]}%,${this._hsl[2]}%)` : ',100%,50%)'
		const ctx = this.hueWheelContext
		ctx.clearRect(0, 0, wheelDiameter, wheelDiameter)
		ctx.lineWidth = this.wheelThickness
		for (let i = 0; i < 360; i++) {
			ctx.beginPath()
			ctx.arc(center, center, radius, (i - 90.7) * TO_RAD, (i - 89.3) * TO_RAD)
			ctx.strokeStyle = 'hsl(' + i + hslPostfix
			ctx.stroke()
		}
	}

	private _redrawSvSpace() {
		this._updateSvBackground()
		const sideLength = this.svSpaceElement.width
		const ctx = this.svSpaceContext
		const saturationGradient = ctx.createLinearGradient(0, 0, sideLength, 0)
		const valueGradient = ctx.createLinearGradient(0, 0, 0, sideLength)
		saturationGradient.addColorStop(0, 'rgba(255,255,255,1)')
		saturationGradient.addColorStop(1, 'rgba(255,255,255,0)')
		valueGradient.addColorStop(0, 'rgba(0,0,0,0)')
		valueGradient.addColorStop(1, 'rgba(0,0,0,1)')
		ctx.fillStyle = saturationGradient
		ctx.fillRect(0, 0, sideLength, sideLength)
		ctx.fillStyle = valueGradient
		ctx.fillRect(0, 0, sideLength, sideLength)
	}

	private _updateSvBackground() {
		this.svSpaceElement.style.backgroundColor = `hsl(${this._hsv[0]},100%,50%)`
	}

	private _redrawHueHandle() {
		const center = this.wheelDiameter / 2
		const wheelRadius = center - this.wheelThickness / 2
		const angle = (this._hsv[0] - 90) * Math.PI / 180
		const hueHandleStyle = this.hueHandleElement.style
		hueHandleStyle.left = `${wheelRadius * Math.cos(angle) + center}px`
		hueHandleStyle.top = `${wheelRadius * Math.sin(angle) + center}px`
	}

	private _redrawSvHandle() {
		const svSpaceElement = this.svSpaceElement
		const svHandleStyle = this.svHandleElement.style
		svHandleStyle.left = `${svSpaceElement.offsetLeft + svSpaceElement.offsetWidth * this._hsv[1] / 100}px`
		svHandleStyle.top = `${svSpaceElement.offsetTop + svSpaceElement.offsetHeight * (1 - this._hsv[2] / 100)}px`
	}

	private _onMoveHueHandle = (event: { clientX: number, clientY: number }) => {
		const hueWheelRect = this.hueWheelElement.getBoundingClientRect()
		const center = this.wheelDiameter / 2
		const x = event.clientX - hueWheelRect.left - center
		const y = event.clientY - hueWheelRect.top - center
		const angle = Math.atan2(y, x)
		this.hsv = [angle * 180 / Math.PI + 90, this.hsv[1], this.hsv[2]]
	}

	private _onMoveSvHandle = (event: { clientX: number, clientY: number }) => {
		const svSpaceRect = this.svSpaceElement.getBoundingClientRect()
		const s = 100 * (event.clientX - svSpaceRect.left) / svSpaceRect.width
		const v = 100 * (svSpaceRect.bottom - event.clientY) / svSpaceRect.height
		this.hsv = [this._hsv[0], s, v]
	}

	private _option<P extends keyof typeof defaultOptions>(property: P): typeof defaultOptions[P] {
		const option = this.options[property]
		return option !== undefined ? option! : defaultOptions[property]
	}
}

function createElementWithClass<K extends keyof HTMLElementTagNameMap>(tagName: K, className: string) {
	const element = document.createElement(tagName)
	element.className = className
	return element
}
