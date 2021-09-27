/**
 * @Author: Erik Slovak <erik.slovak@technologystudio.sk>
 * @Date: 2021-08-18T19:08:50+02:00
 * @Copyright: Technology Studio
**/

import {
  fork,
  take,
  cancel,
  ForkEffect,
} from 'redux-saga/effects'
import type { Task } from '@redux-saga/types'
import type {
  ContextServiceAction,
  DefaultRootService,
} from '@txo/service-react'
import { configManager } from '@txo-peer-dep/redux-saga'
import { Log } from '@txo/log'

const log = new Log('txo.redux-saga.Api.SagaEffectHelper')

const DEFAULT_CONTEXT = 'default'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const takeLatestByContext = <Fn extends (...args: any[]) => any>(
  patternOrChannel: string,
  saga: Fn,
  service: DefaultRootService,
): ForkEffect<never> => fork(function * () {
    const lastTaskContextMap: Record<string, Task> = {}
    while (true) {
      const action: ContextServiceAction = yield take(patternOrChannel)
      const context = action.context ?? DEFAULT_CONTEXT
      const lastTask = lastTaskContextMap[context]
      if (lastTask) {
        yield cancel(lastTask) // cancel is no-op if the task has already terminated
        log.debug(`cancelled: ${context}`)
      }
      // @ts-expect-error -- Argument of type '[DefaultRootService, ContextServiceAction<{}, undefined, undefined>]' is not assignable to parameter of type 'Parameters<Fn>'. ts(2345)
      lastTaskContextMap[context] = yield fork<Fn>(saga, service, action)
    }
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const errorSafeFork = <Fn extends (...args: any[]) => any>(
  fn: Fn,
  ...args: Parameters<Fn>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): ForkEffect<any> => {
  try {
    return fork(fn, ...args)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    configManager.config.onError(error)
    return fork(function * () {
      yield take('*')
    })
  }
}
