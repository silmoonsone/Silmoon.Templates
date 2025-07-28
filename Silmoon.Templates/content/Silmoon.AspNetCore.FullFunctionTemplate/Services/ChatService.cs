using Microsoft.AspNetCore.SignalR;
using Silmoon.AspNetCore.FullFunctionTemplate.Hubs;
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;

namespace Silmoon.AspNetCore.FullFunctionTemplate.Services
{
    public class ChatService
    {
        private readonly IHubContext<ChatServiceHub> chatServiceHub;
        private static readonly ConcurrentBiDictionary<string, string> _connections = [];
        public ChatService(IHubContext<ChatServiceHub> hubContext)
        {
            chatServiceHub = hubContext;
        }

        public async Task SendToMe(HubCallerContext context, string message)
        {
            if (!_connections.ContainsKey(context.ConnectionId))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "You must be signed in to send messages.");
                return;
            }

            if (string.IsNullOrEmpty(message))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Message cannot be empty.");
                return;
            }

            await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ReceiveMessage", $"{DateTime.Now}", _connections[context.ConnectionId], message, false);
        }

        public async Task SendToAll(HubCallerContext context, string message)
        {
            if (!_connections.ContainsKey(context.ConnectionId))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "You must be signed in to send messages.");
                return;
            }

            if (string.IsNullOrEmpty(message))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Message cannot be empty.");
                return;
            }

            await chatServiceHub.Clients.All.SendAsync("ReceiveMessage", $"{DateTime.Now}", _connections[context.ConnectionId], message, false);
        }

        public async Task SendToUser(HubCallerContext context, string username, string message)
        {
            if (!_connections.ContainsKey(context.ConnectionId))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "You must be signed in to send messages.");
                return;
            }

            if (string.IsNullOrEmpty(username))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Username cannot be empty.");
                return;
            }

            if (string.IsNullOrEmpty(message))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Message cannot be empty.");
                return;
            }

            if (_connections.TryGetKeyByValue(username, out var userConnectionId))
            {
                await chatServiceHub.Clients.Client(userConnectionId).SendAsync("ReceiveMessage", $"{DateTime.Now}", _connections[context.ConnectionId], message, true);
            }
            else
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", $"User '{username}' does not exist.");
            }
        }

        public async Task UserSignIn(HubCallerContext context, string username)
        {
            if (string.IsNullOrEmpty(username))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Username cannot be empty.");
                return;
            }

            if (_connections.ContainsKey(username))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Username already exists.");
                return;
            }

            _connections[context.ConnectionId] = username;
            await chatServiceHub.Clients.All.SendAsync("UserSignedIn", username);
        }

        public async Task UserSignOut(HubCallerContext context, string username)
        {
            if (string.IsNullOrEmpty(username))
            {
                await chatServiceHub.Clients.Client(context.ConnectionId).SendAsync("ErrorMessage", "Username cannot be empty.");
                return;
            }

            if (_connections.TryRemoveByValue(username, out var connectionId))
            {
                _connections.TryRemoveByKey(connectionId, out _);
                await chatServiceHub.Clients.All.SendAsync("UserSignedOut", username);
            }
        }

        public async Task HandleDisconnect(HubCallerContext context)
        {
            if (_connections.TryRemoveByKey(context.ConnectionId, out var username))
            {
                await chatServiceHub.Clients.All.SendAsync("UserSignedOut", username);
            }
        }
    }
}