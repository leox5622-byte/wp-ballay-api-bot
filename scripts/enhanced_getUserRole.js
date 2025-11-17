// Enhanced getUserRole function to fix group admin detection
// Replace the existing getUserRole function in your index.js with this improved version

async function getUserRole(contact, chat, isGroup) {
    try {
        const userId = contact?.id?._serialized || '';
        
        if (!userId) {
            log('Warning: No userId provided to getUserRole', 'warning');
            return 0;
        }

        // Normalize the user ID for consistent comparison
        const normalizedUserId = normalizeJid(userId);
        
        // Check if bot owner (highest priority)
        const isOwner = this.config.adminBot.some(adminId => {
            const normalizedAdminId = normalizeJid(adminId);
            return normalizedAdminId === normalizedUserId;
        });
        
        if (isOwner) {
            log(`User ${normalizedUserId} identified as Bot Owner`, 'info');
            return 2; // Bot Owner
        }

        // Check if group admin (only in group context)
        if (isGroup) {
            try {
                const groupId = chat?.id?._serialized || '';
                
                if (!groupId) {
                    log('Warning: No groupId available for group admin check', 'warning');
                    return 0;
                }

                // Check cache first to avoid repeated API calls
                let meta = this.groupCache.get(groupId);
                
                if (!meta) {
                    log(`Fetching group metadata for ${groupId}`, 'info');
                    meta = await this.sock.groupMetadata(groupId);
                    
                    // Cache the metadata for 5 minutes
                    this.groupCache.set(groupId, meta, 300);
                }

                if (!meta || !meta.participants) {
                    log(`Warning: No participants found in group metadata for ${groupId}`, 'warning');
                    return 0;
                }

                // Find the participant in the group
                const participant = meta.participants.find(p => {
                    // Handle different participant ID formats
                    let pid = p.id;
                    
                    if (typeof pid === 'object') {
                        pid = pid._serialized || pid.user || pid;
                    }
                    
                    if (typeof pid === 'string') {
                        return normalizeJid(pid) === normalizedUserId;
                    }
                    
                    return false;
                });

                if (participant) {
                    // Check admin status
                    const adminStatus = participant.admin;
                    const isGroupAdmin = ['admin', 'superadmin'].includes(adminStatus);
                    
                    if (isGroupAdmin) {
                        log(`User ${normalizedUserId} identified as Group Admin in ${groupId}`, 'info');
                        return 1; // Group Admin
                    } else {
                        log(`User ${normalizedUserId} found in group but not admin (status: ${adminStatus})`, 'info');
                    }
                } else {
                    log(`User ${normalizedUserId} not found in group ${groupId} participants`, 'warning');
                }
                
            } catch (groupError) {
                log(`Error fetching group metadata: ${groupError.message}`, 'error');
                
                // Fallback: try to get participants from chat object
                if (chat && Array.isArray(chat.participants)) {
                    const participant = chat.participants.find(p => {
                        const pid = typeof p.id === 'string' ? p.id : p.id?._serialized;
                        return normalizeJid(pid) === normalizedUserId;
                    });
                    
                    if (participant && ['admin', 'superadmin'].includes(participant.admin)) {
                        log(`User ${normalizedUserId} identified as Group Admin (fallback method)`, 'info');
                        return 1;
                    }
                }
            }
        }

        // Default to regular user
        log(`User ${normalizedUserId} identified as Regular User`, 'info');
        return 0; // Regular user
        
    } catch (error) {
        log(`Error in getUserRole for user ${contact?.id?._serialized}: ${error.message}`, 'error');
        return 0; // Default to regular user on error
    }
}

// Export the function (if using modules)
module.exports = { getUserRole };
