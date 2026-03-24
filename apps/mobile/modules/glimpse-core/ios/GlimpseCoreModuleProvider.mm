#import <Foundation/Foundation.h>
#import <NitroModules/HybridObjectRegistry.hpp>
#include <string>
#include "HybridGlimpseCore.hpp"

@interface GlimpseCoreModuleProvider : NSObject
@end

@implementation GlimpseCoreModuleProvider

+ (void)load {
  const char *cDataPath = [[self getDataPath] UTF8String];
  std::string dataPath(cDataPath);

  ll3::glimpse::HybridGlimpseCore::setDataPath(dataPath);

  using namespace margelo::nitro;

  HybridObjectRegistry::registerHybridObjectConstructor(
    "GlimpseCore",
    []() -> std::shared_ptr<HybridObject> {
      return std::make_shared<ll3::glimpse::HybridGlimpseCore>();
    });
}

+ (NSString *)getDataPath {
  NSString *appGroupID = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"AppGroupID"];
  NSString *dataPath = nil;

  if (appGroupID != nil) {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSURL *containerURL = [fileManager containerURLForSecurityApplicationGroupIdentifier:appGroupID];

    if (containerURL == nil) {
      throw [NSException exceptionWithName:@"GlimpseCoreInitializationException"
                                    reason:[NSString stringWithFormat:@"Invalid AppGroup ID: %@", appGroupID]
                                  userInfo:nil];
      } else {
        dataPath = [containerURL path];
      }
  } else {
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, true);
    dataPath = [paths firstObject];
  }

  return dataPath;
}

@end
