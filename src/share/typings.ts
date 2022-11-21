import type { IProgressMessage, ISerializedFileMatch, ISerializedSearchSuccess } from 'ripgrep-wrapper'

export interface SearchMessage<T extends 'result' | 'message' | 'done' | 'error'> {
  type: T
  payload: T extends 'result'
    ? ISerializedFileMatch[]
      : T extends 'message'
        ? IProgressMessage
          : T extends 'done'
            ? ISerializedSearchSuccess
              : Error
}
