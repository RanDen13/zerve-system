type ActionResult<T> =
  | {
      success: true;
      data?: T;
      message?: string;
    }
  | {
      success: false;
      message: string;
      cause?: any;
    };

export default ActionResult;
