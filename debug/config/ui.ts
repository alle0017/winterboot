class UiMetadataContext {
      constructor(private readonly ctx: DecoratorMetadataObject) {}

      public set uiBuilder(value: undefined | (() => string)) {
            this.ctx.debugUiBuilder = value;
      }
      public get uiBuilder() {
            return this.ctx.debugUiBuilder as (undefined | (() => string));
      }
}

