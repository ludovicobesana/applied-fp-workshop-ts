import { match } from "ts-pattern"
import { Either } from "fp-ts/Either"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/lib/function"

type Rover = { position: Position; direction: Direction }
type Planet = { size: Size; obstacles: ReadonlyArray<Obstacle> }
type Obstacle = { position: Position }
type Position = { x: number; y: number }
type Size = { width: number; height: number }
type Delta = { x: number; y: number }

type Command = "TurnRight" | "TurnLeft" | "MoveForward" | "MoveBackward"
type Direction = "N" | "E" | "W" | "S"

type ParseError = InvalidPlanet
type InvalidPlanet = { readonly _tag: "InvalidPlanet"; readonly error: Error }

export const invalidPlanet = (e: Error): ParseError => ({ _tag: "InvalidPlanet", error: e })

// PARSING

export const parseSize = (input: string): Either<ParseError, Size> =>
  pipe(
    parseInts("x", input),
    E.map((tuple) => ({ width: tuple.first, height: tuple.second })),
    E.mapLeft(invalidPlanet),
  )

const parseInts = (
  separator: string,
  input: string,
): Either<Error, { first: number; second: number }> =>
  E.tryCatch(() => unsafeParseInts(separator, input), E.toError)

const unsafeParseInts = (separator: string, input: string): { first: number; second: number } => {
  const parts = input.split(separator)
  const first = Number(parts[0])
  const second = Number(parts[1])

  if (!first || !second) throw new Error(`Cannot parse ints (${separator}): ${input}`)

  return { first, second }
}

// RENDERING

const render = (rover: Rover): string =>
  `${rover.position.x}:${rover.position.y}:${rover.direction}`

// DOMAIN

const executeAll = (planet: Planet, rover: Rover, commands: ReadonlyArray<Command>): Rover =>
  commands.reduce(execute(planet), rover)

const execute =
  (planet: Planet) =>
  (rover: Rover, command: Command): Rover =>
    match(command)
      .with("TurnRight", () => turnRight(rover))
      .with("TurnLeft", () => turnLeft(rover))
      .with("MoveForward", () => moveForward(planet, rover))
      .with("MoveBackward", () => moveBackward(planet, rover))
      .exhaustive()

const turnRight = (rover: Rover): Rover => {
  const newDirection = match(rover.direction)
    .with("N", () => "E" as const)
    .with("E", () => "S" as const)
    .with("S", () => "W" as const)
    .with("W", () => "N" as const)
    .exhaustive()

  return updateRover({ direction: newDirection })(rover)
}

const turnLeft = (rover: Rover): Rover => {
  const newDirection = match(rover.direction)
    .with("N", () => "W" as const)
    .with("W", () => "S" as const)
    .with("S", () => "E" as const)
    .with("E", () => "N" as const)
    .exhaustive()

  return updateRover({ direction: newDirection })(rover)
}

const moveForward = (planet: Planet, rover: Rover): Rover => {
  const newPosition = next(planet, rover, delta(rover.direction))
  return updateRover({ position: newPosition })(rover)
}

const moveBackward = (planet: Planet, rover: Rover): Rover => {
  const newPosition = next(planet, rover, delta(opposite(rover.direction)))
  return updateRover({ position: newPosition })(rover)
}

const opposite = (direction: Direction): Direction => {
  return match(direction)
    .with("N", () => "S" as const)
    .with("S", () => "N" as const)
    .with("E", () => "W" as const)
    .with("W", () => "E" as const)
    .exhaustive()
}

const delta = (direction: Direction): Delta => {
  return match(direction)
    .with("N", () => ({ x: 0, y: 1 }))
    .with("S", () => ({ x: 0, y: -1 }))
    .with("E", () => ({ x: 1, y: 0 }))
    .with("W", () => ({ x: -1, y: 0 }))
    .exhaustive()
}

const next = (planet: Planet, rover: Rover, delta: Delta): Position => {
  const position = rover.position
  const newX = wrap(position.x, planet.size.width, delta.x)
  const newY = wrap(position.y, planet.size.height, delta.y)
  return updatePosition({ x: newX, y: newY })(position)
}

const wrap = (value: number, limit: number, delta: number): number =>
  (((value + delta) % limit) + limit) % limit

const updatePosition =
  (values: Partial<Position>) =>
  (actual: Position): Position => ({
    x: values.x != null ? values.x : actual.x,
    y: values.y != null ? values.y : actual.y,
  })

const updateRover =
  (values: Partial<Rover>) =>
  (actual: Rover): Rover => ({
    position: values.position != null ? values.position : actual.position,
    direction: values.direction != null ? values.direction : actual.direction,
  })
