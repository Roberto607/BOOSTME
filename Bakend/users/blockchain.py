"""
Módulo para interactuar con Polygon blockchain y procesar retiros de USDT.
"""
from web3 import Web3
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# USDT ABI (minimal - solo necesitamos la función transfer)
USDT_ABI = [
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
]


class PolygonManager:
    """Gestiona transacciones de USDT en Polygon."""
    
    def __init__(self):
        self.rpc_url = settings.POLYGON_RPC_URL
        self.owner_address = settings.OWNER_WALLET_ADDRESS
        self.owner_private_key = settings.OWNER_WALLET_PRIVATE_KEY
        self.usdt_contract_address = settings.USDT_CONTRACT_ADDRESS
        
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        if not self.w3.is_connected():
            logger.error("❌ No se pudo conectar a Polygon RPC")
            raise Exception("No connection to Polygon RPC")
        
        logger.info(f"✅ Conectado a Polygon: {self.w3.eth.chain_id}")
        
        # Validar direcciones
        if not Web3.is_address(self.owner_address):
            raise ValueError(f"Dirección del propietario inválida: {self.owner_address}")
        if not Web3.is_address(self.usdt_contract_address):
            raise ValueError(f"Dirección USDT inválida: {self.usdt_contract_address}")
    
    def get_contract(self):
        """Retorna el contrato USDT."""
        return self.w3.eth.contract(
            address=Web3.to_checksum_address(self.usdt_contract_address),
            abi=USDT_ABI
        )
    
    def get_balance(self, address):
        """Obtiene el balance de USDT de una dirección."""
        try:
            contract = self.get_contract()
            checksum_address = Web3.to_checksum_address(address)
            balance_wei = contract.functions.balanceOf(checksum_address).call()
            # USDT tiene 6 decimales
            balance_usdt = balance_wei / 10**6
            return balance_usdt
        except Exception as e:
            logger.error(f"Error obteniendo balance: {e}")
            return 0
    
    def send_usdt(self, to_address, usdt_amount):
        """
        Envía USDT a una dirección.
        
        Args:
            to_address: Dirección de destino (0x...)
            usdt_amount: Cantidad en USDT (ej: 5.0)
        
        Returns:
            dict: {"success": bool, "tx_hash": str, "error": str}
        """
        try:
            # Validar dirección de destino
            if not Web3.is_address(to_address):
                return {
                    "success": False,
                    "error": f"Dirección inválida: {to_address}"
                }
            
            to_address = Web3.to_checksum_address(to_address)
            owner_address = Web3.to_checksum_address(self.owner_address)
            
            # Convertir USDT a wei (USDT tiene 6 decimales)
            usdt_wei = int(usdt_amount * 10**6)
            
            contract = self.get_contract()
            
            # Construir la transacción
            tx = contract.functions.transfer(to_address, usdt_wei).build_transaction({
                'from': owner_address,
                'nonce': self.w3.eth.get_transaction_count(owner_address),
                'gas': 100000,
                'gasPrice': self.w3.eth.gas_price,
            })
            
            # Firmar la transacción
            signed_tx = self.w3.eth.account.sign_transaction(
                tx,
                private_key=self.owner_private_key
            )
            
            # Enviar la transacción
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            tx_hash_str = tx_hash.hex()
            
            logger.info(f"✅ Transacción enviada: {tx_hash_str}")
            
            return {
                "success": True,
                "tx_hash": tx_hash_str,
                "error": None
            }
        
        except Exception as e:
            logger.error(f"❌ Error enviando USDT: {e}")
            return {
                "success": False,
                "tx_hash": None,
                "error": str(e)
            }
    
    def wait_for_transaction(self, tx_hash, timeout=300):
        """
        Espera a que se confirme una transacción.
        
        Args:
            tx_hash: Hash de la transacción
            timeout: Segundos a esperar (default: 5 min)
        
        Returns:
            dict: Receipt de la transacción o error
        """
        try:
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=timeout)
            if receipt['status'] == 1:
                logger.info(f"✅ Transacción confirmada: {tx_hash.hex()}")
                return {"success": True, "receipt": dict(receipt)}
            else:
                logger.error(f"❌ Transacción fallida: {tx_hash.hex()}")
                return {"success": False, "error": "Transacción fallida en blockchain"}
        except Exception as e:
            logger.error(f"❌ Error esperando transacción: {e}")
            return {"success": False, "error": str(e)}


# Instancia global (se crea una sola vez)
try:
    polygon_manager = PolygonManager()
except Exception as e:
    logger.error(f"No se pudo inicializar PolygonManager: {e}")
    polygon_manager = None


class BscManager:
    """Gestiona transacciones de USDT en Binance Smart Chain (BEP-20)."""

    def __init__(self):
        self.rpc_url = getattr(settings, 'BSC_RPC_URL', None)
        self.owner_address = settings.OWNER_WALLET_ADDRESS
        self.owner_private_key = settings.OWNER_WALLET_PRIVATE_KEY
        self.usdt_contract_address = getattr(settings, 'BSC_USDT_CONTRACT_ADDRESS', None)
        # USDT on BSC commonly uses 18 decimals
        self.usdt_decimals = getattr(settings, 'BSC_USDT_DECIMALS', 18)

        if not self.rpc_url or not self.usdt_contract_address:
            logger.warning('BSC RPC or USDT contract address not configured; BSC manager disabled')
            self.w3 = None
            return

        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))

        if not self.w3.is_connected():
            logger.error("❌ No se pudo conectar a BSC RPC")
            raise Exception("No connection to BSC RPC")

        logger.info(f"✅ Conectado a BSC: {self.w3.eth.chain_id}")

        # Validar direcciones
        if not Web3.is_address(self.owner_address):
            raise ValueError(f"Dirección del propietario inválida: {self.owner_address}")
        if not Web3.is_address(self.usdt_contract_address):
            raise ValueError(f"Dirección USDT inválida: {self.usdt_contract_address}")

    def get_contract(self):
        if not self.w3:
            raise Exception('BSC provider no inicializado')
        return self.w3.eth.contract(
            address=Web3.to_checksum_address(self.usdt_contract_address),
            abi=USDT_ABI
        )

    def send_usdt(self, to_address, usdt_amount):
        try:
            if not self.w3:
                return {"success": False, "error": "BSC manager no inicializado"}

            if not Web3.is_address(to_address):
                return {"success": False, "error": f"Dirección inválida: {to_address}"}

            to_address = Web3.to_checksum_address(to_address)
            owner_address = Web3.to_checksum_address(self.owner_address)

            usdt_wei = int(usdt_amount * 10**self.usdt_decimals)

            contract = self.get_contract()

            tx = contract.functions.transfer(to_address, usdt_wei).build_transaction({
                'from': owner_address,
                'nonce': self.w3.eth.get_transaction_count(owner_address),
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price,
            })

            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self.owner_private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            tx_hash_str = tx_hash.hex()

            logger.info(f"✅ Transacción BSC enviada: {tx_hash_str}")
            return {"success": True, "tx_hash": tx_hash_str, "error": None}
        except Exception as e:
            logger.error(f"❌ Error enviando USDT en BSC: {e}")
            return {"success": False, "tx_hash": None, "error": str(e)}


try:
    bsc_manager = BscManager()
except Exception as e:
    logger.error(f"No se pudo inicializar BscManager: {e}")
    bsc_manager = None
