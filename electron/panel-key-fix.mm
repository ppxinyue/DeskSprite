#include <node_api.h>
#import <Cocoa/Cocoa.h>

static napi_value make_bool(napi_env env, bool value) {
  napi_value result;
  napi_get_boolean(env, value, &result);
  return result;
}

static void throw_type_error(napi_env env, const char* message) {
  napi_throw_type_error(env, nullptr, message);
}

static bool get_window_from_handle(napi_env env, napi_value value, NSWindow** out_window) {
  bool is_buffer = false;
  napi_status status = napi_is_buffer(env, value, &is_buffer);
  if (status != napi_ok || !is_buffer) {
    throw_type_error(env, "Expected a native window handle Buffer");
    return false;
  }

  void* data = nullptr;
  size_t length = 0;
  status = napi_get_buffer_info(env, value, &data, &length);
  if (status != napi_ok || !data || length < sizeof(void*)) {
    throw_type_error(env, "Invalid native window handle Buffer");
    return false;
  }

  __unsafe_unretained NSView* view = *reinterpret_cast<__unsafe_unretained NSView**>(data);
  if (view == nil) {
    *out_window = nil;
    return true;
  }

  if ([NSThread isMainThread]) {
    *out_window = [view window];
    return true;
  }

  __block NSWindow* window = nil;
  dispatch_sync(dispatch_get_main_queue(), ^{
    window = [view window];
  });
  *out_window = window;
  return true;
}

static void configure_window(NSWindow* window) {
  if (window == nil) return;

  NSWindowCollectionBehavior behavior = [window collectionBehavior];
  behavior |= NSWindowCollectionBehaviorCanJoinAllSpaces;
  behavior |= NSWindowCollectionBehaviorFullScreenAuxiliary;
  behavior |= NSWindowCollectionBehaviorStationary;
  behavior |= NSWindowCollectionBehaviorIgnoresCycle;
  [window setCollectionBehavior:behavior];
  [window setAcceptsMouseMovedEvents:YES];

  if ([window isKindOfClass:[NSPanel class]]) {
    NSPanel* panel = (NSPanel*)window;
    [panel setFloatingPanel:YES];
    [panel setBecomesKeyOnlyIfNeeded:NO];
    [panel setWorksWhenModal:YES];
    [panel setHidesOnDeactivate:NO];
  }
}

static void set_window_level(NSWindow* window, NSInteger level) {
  if (window == nil) return;
  [window setLevel:level];
}

static napi_value SetPanelKeyable(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_status status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (status != napi_ok || argc < 1) {
    throw_type_error(env, "Expected one argument");
    return nullptr;
  }

  NSWindow* window = nil;
  if (!get_window_from_handle(env, args[0], &window)) {
    return nullptr;
  }

  if ([NSThread isMainThread]) {
    configure_window(window);
  } else {
    dispatch_sync(dispatch_get_main_queue(), ^{
      configure_window(window);
    });
  }

  return make_bool(env, window != nil);
}

static napi_value SetPanelLevelFloating(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_status status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (status != napi_ok || argc < 1) {
    throw_type_error(env, "Expected one argument");
    return nullptr;
  }

  NSWindow* window = nil;
  if (!get_window_from_handle(env, args[0], &window)) {
    return nullptr;
  }

  if ([NSThread isMainThread]) {
    set_window_level(window, NSFloatingWindowLevel);
  } else {
    dispatch_sync(dispatch_get_main_queue(), ^{
      set_window_level(window, NSFloatingWindowLevel);
    });
  }

  return make_bool(env, window != nil);
}

static napi_value SetPanelLevelScreenSaver(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_status status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  if (status != napi_ok || argc < 1) {
    throw_type_error(env, "Expected one argument");
    return nullptr;
  }

  NSWindow* window = nil;
  if (!get_window_from_handle(env, args[0], &window)) {
    return nullptr;
  }

  if ([NSThread isMainThread]) {
    set_window_level(window, NSScreenSaverWindowLevel);
  } else {
    dispatch_sync(dispatch_get_main_queue(), ^{
      set_window_level(window, NSScreenSaverWindowLevel);
    });
  }

  return make_bool(env, window != nil);
}

NAPI_MODULE_INIT() {
  napi_value fn;
  napi_create_function(env, "setPanelKeyable", NAPI_AUTO_LENGTH, SetPanelKeyable, nullptr, &fn);
  napi_set_named_property(env, exports, "setPanelKeyable", fn);
  napi_create_function(env, "setPanelLevelFloating", NAPI_AUTO_LENGTH, SetPanelLevelFloating, nullptr, &fn);
  napi_set_named_property(env, exports, "setPanelLevelFloating", fn);
  napi_create_function(env, "setPanelLevelScreenSaver", NAPI_AUTO_LENGTH, SetPanelLevelScreenSaver, nullptr, &fn);
  napi_set_named_property(env, exports, "setPanelLevelScreenSaver", fn);
  return exports;
}
