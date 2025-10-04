import { NoteFormData } from '../types/Note';

export interface ConflictResolution {
  resolved: boolean;
  data: NoteFormData;
  strategy: 'local' | 'remote' | 'merged';
  conflicts: string[];
}

export class ConflictResolver {
  private static instance: ConflictResolver;

  static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  // Resolve conflicts between local and remote versions
  resolveConflict(
    localData: NoteFormData,
    remoteData: NoteFormData,
    lastSyncTime: Date
  ): ConflictResolution {
    const conflicts: string[] = [];
    let strategy: 'local' | 'remote' | 'merged' = 'local';

    // Check for conflicts in different fields
    const titleConflict = localData.title !== remoteData.title;
    const contentConflict = localData.content !== remoteData.content;
    const tagsConflict = JSON.stringify(localData.tags) !== JSON.stringify(remoteData.tags);

    if (titleConflict) conflicts.push('title');
    if (contentConflict) conflicts.push('content');
    if (tagsConflict) conflicts.push('tags');

    // If no conflicts, use local data
    if (conflicts.length === 0) {
      return {
        resolved: true,
        data: localData,
        strategy: 'local',
        conflicts: [],
      };
    }

    // Simple conflict resolution strategy:
    // - If content changed, prefer local (user is actively editing)
    // - If only metadata changed, merge them
    if (contentConflict) {
      // Content conflict - prefer local
      strategy = 'local';
    } else {
      // Metadata conflict - merge
      strategy = 'merged';
    }

    const resolvedData: NoteFormData = {
      ...localData,
      // Merge tags if there's a conflict
      tags: tagsConflict ? this.mergeTags(localData.tags, remoteData.tags) : localData.tags,
    };

    return {
      resolved: true,
      data: resolvedData,
      strategy,
      conflicts,
    };
  }

  // Merge tags from both versions
  private mergeTags(localTags: string[], remoteTags: string[]): string[] {
    const merged = new Set([...localTags, ...remoteTags]);
    return Array.from(merged);
  }

  // Check if there are potential conflicts
  hasPotentialConflicts(
    localData: NoteFormData,
    remoteData: NoteFormData
  ): boolean {
    return (
      localData.title !== remoteData.title ||
      localData.content !== remoteData.content ||
      JSON.stringify(localData.tags) !== JSON.stringify(remoteData.tags)
    );
  }

  // Get a human-readable conflict summary
  getConflictSummary(conflicts: string[]): string {
    if (conflicts.length === 0) return 'No conflicts';
    
    const conflictMap: Record<string, string> = {
      title: 'Title',
      content: 'Content',
      tags: 'Tags',
    };

    return conflicts.map(conflict => conflictMap[conflict] || conflict).join(', ');
  }
}

export const conflictResolver = ConflictResolver.getInstance(); 