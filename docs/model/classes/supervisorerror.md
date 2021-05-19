[@scramjet/model](../README.md) / SupervisorError

# Class: SupervisorError

## Hierarchy

* [*AppError*](apperror.md)

  ↳ **SupervisorError**

## Implements

* [*ISupervisorErrorData*](../README.md#isupervisorerrordata)

## Table of contents

### Constructors

- [constructor](supervisorerror.md#constructor)

### Properties

- [code](supervisorerror.md#code)
- [data](supervisorerror.md#data)
- [message](supervisorerror.md#message)
- [name](supervisorerror.md#name)
- [prepareStackTrace](supervisorerror.md#preparestacktrace)
- [stack](supervisorerror.md#stack)
- [stackTraceLimit](supervisorerror.md#stacktracelimit)

### Methods

- [captureStackTrace](supervisorerror.md#capturestacktrace)

## Constructors

### constructor

\+ **new SupervisorError**(`code`: SupervisorErrorCode, `data?`: *any*): [*SupervisorError*](supervisorerror.md)

#### Parameters:

Name | Type |
------ | ------ |
`code` | SupervisorErrorCode |
`data?` | *any* |

**Returns:** [*SupervisorError*](supervisorerror.md)

Inherited from: [AppError](apperror.md)

Defined in: [src/errors/supervisor-error.ts:6](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/errors/supervisor-error.ts#L6)

## Properties

### code

• **code**: AppErrorCode

Inherited from: [AppError](apperror.md).[code](apperror.md#code)

Defined in: [src/errors/app-error.ts:8](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/errors/app-error.ts#L8)

___

### data

• `Optional` **data**: *any*

Inherited from: [AppError](apperror.md).[data](apperror.md#data)

Defined in: [src/errors/app-error.ts:9](https://github.com/scramjet-cloud-platform/scramjet-csi-dev/blob/01ff585/packages/model/src/errors/app-error.ts#L9)

___

### message

• **message**: *string*

Inherited from: [AppError](apperror.md).[message](apperror.md#message)

Defined in: node_modules/typescript/lib/lib.es5.d.ts:974

___

### name

• **name**: *string*

Inherited from: [AppError](apperror.md).[name](apperror.md#name)

Defined in: node_modules/typescript/lib/lib.es5.d.ts:973

___

### prepareStackTrace

• `Optional` **prepareStackTrace**: *undefined* \| (`err`: Error, `stackTraces`: CallSite[]) => *any*

Optional override for formatting stack traces

**`see`** https://v8.dev/docs/stack-trace-api#customizing-stack-traces

Defined in: node_modules/@types/node/globals.d.ts:11

___

### stack

• `Optional` **stack**: *undefined* \| *string*

Inherited from: [AppError](apperror.md).[stack](apperror.md#stack)

Defined in: node_modules/typescript/lib/lib.es5.d.ts:975

___

### stackTraceLimit

• **stackTraceLimit**: *number*

Defined in: node_modules/@types/node/globals.d.ts:13

## Methods

### captureStackTrace

▸ **captureStackTrace**(`targetObject`: *object*, `constructorOpt?`: Function): *void*

Create .stack property on a target object

#### Parameters:

Name | Type |
------ | ------ |
`targetObject` | *object* |
`constructorOpt?` | Function |

**Returns:** *void*

Defined in: node_modules/@types/node/globals.d.ts:4