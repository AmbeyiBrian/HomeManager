# Mobile App - Recent Updates

## AuthContext Refactoring (June 2025)

The monolithic `AuthContext.js` file (originally over 3000 lines) has been refactored into a modular structure for better maintainability. The new structure provides the same functionality but with improved organization by feature area.

### Key Benefits:
- Code is now organized by feature/domain
- Each module can be maintained separately
- Better code isolation makes it easier to add new features
- Improved readability and structure

### Directory Structure:
- `/mobile/context/auth/` - Contains all the refactored modules
- See [README.md](/mobile/context/auth/README.md) for detailed documentation

### Migration:
- Original imports continue to work through backward compatibility
- For new code, consider importing from the feature-specific modules

```javascript
// Both of these continue to work
import { useAuth } from '../context/AuthContext';
// Or use the more explicit import:
import { useAuth } from '../context/auth';
```

### Related Documentation
- [Auth Module Structure](/mobile/context/auth/README.md)
- [Original Auth Implementation Backup](/mobile/context/AuthContext.original.js)
- [Subscription Module Documentation](/docs/mobile/SUBSCRIPTION_MODULE.md) - Details of the subscription module architecture
